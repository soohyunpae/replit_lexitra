import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@db";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPgSimple(session);
  
  // 세션 정리 주기 설정 (1일)
  const sessionCleanupInterval = 1000 * 60 * 60 * 24;
  
  const sessionSettings: session.SessionOptions = {
    name: 'lexitra.sid',
    secret: process.env.SESSION_SECRET || "lexitra-secret-key",
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
    store: new PostgresSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
      pruneSessionInterval: sessionCleanupInterval
    }),
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // 세션 디버깅을 위한 미들웨어
  app.use((req, res, next) => {
    console.log('[SESSION DEBUG]', {
      authenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      session: req.session,
      cookies: req.headers.cookie,
      user: req.user
    });
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, { id: user.id, username: user.username });
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      
      if (!user) {
        return done(null, false);
      }
      
      done(null, { id: user.id, username: user.username });
    } catch (error) {
      done(error);
    }
  });

  // Route for registering a new user
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create the user with hashed password
      const [user] = await db.insert(users)
        .values({
          username,
          password: await hashPassword(password),
        })
        .returning({ id: users.id, username: users.username });
      
      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Route for logging in
  app.post("/api/login", (req, res, next) => {
    console.log('\n[LOGIN ATTEMPT]', {
      body: req.body,
      headers: {
        cookie: req.headers.cookie,
        origin: req.headers.origin,
        host: req.headers.host
      }
    });
    
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message: string }) => {
      if (err) {
        console.log('[LOGIN ERROR]', err);
        return next(err);
      }
      
      if (!user) {
        console.log('[LOGIN FAILED]', info);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.log('[LOGIN SESSION ERROR]', err);
          return next(err);
        }
        
        // 응답 전에 세션 상태 확인
        console.log('[LOGIN SUCCESS]', {
          user,
          sessionID: req.sessionID,
          authenticated: req.isAuthenticated(),
          cookies: req.headers.cookie
        });
        
        // 중요: 여기서 수동으로 Set-Cookie를 설정하지 않음
        // express-session이 자동으로 처리함
        
        return res.json(user);
      });
    })(req, res, next);
  });

  // Route for logging out
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      return res.sendStatus(200);
    });
  });

  // Route for getting current user
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  // Route for getting user profile
  app.get("/api/profile", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    return res.json(req.user);
  });
}
