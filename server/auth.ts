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
  
  // 테스팅을 위해 메모리 스토어 사용
  const memoryStore = new session.MemoryStore();
  
  const sessionSettings: session.SessionOptions = {
    name: 'lexitra.sid',
    secret: process.env.SESSION_SECRET || "lexitra-secret-key",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    },
    store: memoryStore,
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

  // Route for registering a new user - 더 단순한 방식으로 변경
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
        
        console.log('User registered and logged in successfully:', user.id);
        return res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Route for logging in - 더 단순한 방식으로 변경
  app.post("/api/login", passport.authenticate("local"), (req: Request & { user?: Express.User }, res) => {
    // 인증이 성공하면 이 코드가 실행됨
    const user = req.user as { id: number, username: string };
    console.log('User logged in successfully:', user.id);
    res.json(user);
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
