import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';

// Global setTimeout patching to prevent timeout integer overflow
// Maximum safe timeout value (32-bit signed integer)
const MAX_TIMEOUT = 2147483647; // ~24.8 days

// Patch global setTimeout to prevent integer overflow errors
const originalSetTimeout = global.setTimeout;
global.setTimeout = function safeSetTimeout(callback: any, ms: number, ...args: any[]) {
  // Clamp timeout to prevent integer overflow
  const safeMs = Math.min(Math.max(0, ms), MAX_TIMEOUT);
  if (safeMs !== ms && ms > MAX_TIMEOUT) {
    console.warn(`Timeout value ${ms} exceeds maximum safe value, clamped to ${MAX_TIMEOUT}`);
  }
  return originalSetTimeout(callback, safeMs, ...args);
} as typeof setTimeout;

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS 설정 - 인증 관련 쿠키를 위해 필수
// Replit 도메인 실시간 사용을 위한 CORS 설정
app.use(cors({
  // Accept requests from any origin in the Replit environment
  origin: function(origin, callback) {
    // Always allow any origin for the authentication system to work properly
    // This is safe because we're using session-based auth with CSRF protection
    callback(null, true);
  },
  // These settings are critical for cookie-based authentication
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept'],
  exposedHeaders: ['Set-Cookie'], // Allow browsers to see the Set-Cookie header
}));

// 세션 관리를 위한 헤더 추가 설정
// cors 모듈에서 이미 헤더를 설정하므로 여기선 삭제
// 중복 설정이 문제를 일으킬 수 있음

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // extended: true 사용하여 중첩 객체 허용

// uploads 디렉토리 확인 및 생성
import fs from 'fs';
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory');
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('uploads directory created successfully');
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}

// 정적 파일 제공
app.use('/uploads', express.static(uploadsDir));

// 멀티파트 데이터 허용 크기 증가 (100MB 제한)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('Server error:', {
      status,
      message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });

    res.status(status).json({ 
      message,
      error: app.get('env') === 'development' ? {
        stack: err.stack,
        name: err.name,
        code: err.code
      } : undefined
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
