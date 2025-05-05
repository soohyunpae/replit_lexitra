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
import { verifyToken, generateToken } from "./token-auth";
import { pool } from "@db";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role?: string; // role 필드 추가
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
  
  // 쿠키 도메인 계산
  // Replit 환경에서는 .repl.co 또는 커스텀 도메인 등 다양한 상황에 맞게 자동 조정
  const cookieDomain = undefined; // undefined로 설정하면 현재 도메인에 쿠키 설정

  const sessionSettings: session.SessionOptions = {
    name: 'lexitra.sid',
    secret: process.env.SESSION_SECRET || "lexitra-secret-key",
    resave: true, // Changed to true to ensure session changes are always saved
    rolling: true, 
    saveUninitialized: true, // Changed to true to ensure cookie is set even for uninitialized sessions
    proxy: true,
    cookie: {
      secure: true, // HTTPS 필수 설정 (Replit 환경에서는 true로 설정해야 함)
      maxAge: 24 * 60 * 60 * 1000, // 1일
      httpOnly: true, 
      sameSite: 'none', // 크로스 사이트 요청을 허용하기 위해 'none'으로 설정
      path: '/', 
      domain: cookieDomain, // 자동으로 현재 도메인에 설정됨
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
        
        return done(null, { id: user.id, username: user.username, role: user.role });
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
      
      done(null, { id: user.id, username: user.username, role: user.role });
    } catch (error) {
      done(error);
    }
  });
  
  // Middleware to ensure sessions are properly saved before sending responses
  app.use((req, res, next) => {
    // Add some additional debugging for session management
    const originalEnd = res.end;
    
    // @ts-ignore - we're monkey patching the response object
    res.end = function(chunk, encoding) {
      if (req.session) {
        console.log(`[DEBUG SESSION ${req.path}]`, {
          headers: res.getHeaders(),
          hasCookieHeader: !!res.getHeader('Set-Cookie'),
          sessionID: req.sessionID,
          authenticated: req.isAuthenticated()
        });
      }
      
      // @ts-ignore - we're monkey patching
      return originalEnd.apply(res, arguments);
    };
    
    next();
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
          role: 'user', // 기본으로 일반 사용자 권한 부여
        })
        .returning({ id: users.id, username: users.username, role: users.role });
      
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
  // Token-based login endpoint that replaces session-based authentication
  app.post("/api/login", (req, res, next) => {
    console.log('\n[LOGIN ATTEMPT]', {
      body: req.body,
      headers: {
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
      
      try {
        // Generate JWT token for the user using the imported function
        const token = generateToken(user);
        
        console.log('[LOGIN SUCCESS]', {
          user,
          tokenGenerated: true
        });
        
        // Return the token along with user info
        return res.json({
          ...user,
          token
        });
      } catch (tokenErr) {
        console.error('[TOKEN GENERATION ERROR]', tokenErr);
        return res.status(500).json({ message: "Failed to generate authentication token" });
      }
    })(req, res, next);
  });

  // Route for logging out
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      return res.sendStatus(200);
    });
  });

  // Use the token verification middleware that was imported at the top
  
  // Route for getting current user - token protected
  app.get("/api/user", verifyToken, (req, res) => {
    // User is already attached to req by verifyToken middleware
    return res.json(req.user);
  });

  // Route for getting user profile - token protected
  app.get("/api/profile", verifyToken, (req, res) => {
    // User is already attached to req by verifyToken middleware
    return res.json(req.user);
  });
}
