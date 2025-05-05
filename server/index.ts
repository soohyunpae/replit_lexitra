import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();

// CORS 설정 - 인증 관련 쿠키를 위해 필수
// Replit 도메인 실시간 사용을 위한 CORS 설정
app.use(cors({
  // 여러 도메인을 허용하기 위해 함수 사용
  origin: function(origin, callback) {
    // 기본 허용 도메인 리스트
    const allowedOrigins = [
      'http://localhost:5173', // 로컬 개발용
      'http://localhost:5000', // 로컬 서버용
    ];
    
    // Replit 도메인 추가
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // Replit 메인 도메인
      allowedOrigins.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      // Replit 비밀 도메인 (id 형식)
      if (process.env.REPLIT_DEPLOYMENT_ID) {
        allowedOrigins.push(`https://${process.env.REPLIT_DEPLOYMENT_ID}.id.repl.co`);
      }
      // .replit.dev 도메인 추가
      allowedOrigins.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`);
    }
    
    // 개발 환경이거나 테스트용이면 null origin도 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // 그렇지 않으면 모든 origin 허용 (기존 코드와 호환성 유지)
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'], // Set-Cookie 헤더 노출 허용
}));

// 세션 관리를 위한 헤더 추가 설정
// cors 모듈에서 이미 헤더를 설정하므로 여기선 삭제
// 중복 설정이 문제를 일으킬 수 있음

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

    res.status(status).json({ message });
    throw err;
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
