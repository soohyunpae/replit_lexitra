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
  
  const sessionSettings: session.SessionOptions = {
    name: 'lexitra.sid', // 쿠키 이름 변경
    secret: process.env.SESSION_SECRET || "lexitra-secret-key",
    resave: true, // 세션을 항상 저장하도록 변경
    saveUninitialized: true, // 초기화되지 않은 세션도 저장
    rolling: true, // 요청마다 세션 유효시간 초기화
    cookie: {
      secure: false, // 개발 환경에서는 false로 설정
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/' // 모든 경로에서 쿠키 사용 가능
    },
    store: new PostgresSessionStore({
      pool,
      tableName: "session", // Default
      createTableIfMissing: true,
    }),
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // 세션 디버깅을 위한 미들웨어
  app.use((req, res, next) => {
    console.log('[SESSION DEBUG]', {
      path: req.path,
      method: req.method,
      authenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      cookie: req.headers.cookie,
      userID: req.user?.id
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
        if (err) {
          console.error('Registration login error:', err);
          return next(err);
        }
        
        // 로그인이 성공했으므로 세션을 저장하고 쿠키를 설정합니다
        req.session.save((err) => {
          if (err) {
            console.error('Registration session save error:', err);
            return next(err);
          }
          console.log('User registered and logged in successfully:', user.id);
          return res.status(201).json(user);
        });
      });
    } catch (error) {
      next(error);
    }
  });

  // Route for logging in
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message: string }) => {
      if (err) {
        console.error('Authentication error:', err);
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        
        // 로그인이 성공했으므로 세션을 저장하고 쿠키를 설정하도록 합니다
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return next(err);
          }
          console.log('User logged in successfully:', user.id);
          return res.json(user);
        });
      });
    })(req, res, next);
  });

  // Route for logging out
  app.post("/api/logout", (req, res, next) => {
    const sessionID = req.sessionID;
    console.log('Logging out user, session ID:', sessionID);
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return next(err);
        }
        res.clearCookie('lexitra.sid', { path: '/' });
        console.log('Session destroyed successfully');
        return res.sendStatus(200);
      });
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
