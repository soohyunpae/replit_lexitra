import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();

// CORS 설정 - 인증 관련 쿠키를 위해 필수
app.use(cors({
  // origin을 함수로 설정하여 요청의 origin에 따라 동적으로 대응
  // 중요: 와일드카드(*) 대신 정확한 문자열을 사용해야 쿠키가 작동함
  origin: function(origin, callback) {
    // 디버깅용 로그
    console.log('[CORS] Request from origin:', origin);
    
    // 모든 요청 허용 (API 테스트에 필요)
    // 그러나 null 대신 웨브소켓이나 사이드 이펙트가 없는 요청에 대해 구체적인 origin을 사용
    if (!origin) {
      return callback(null, true);
    }
    
    // .replit.dev 도메인이거나 로컬 개발 환경인 경우 허용
    if (origin.includes('.replit.dev') || origin.includes('localhost') || origin.includes('0.0.0.0')) {
      return callback(null, origin);
    }
    
    // 프로덕션에서는 특정 도메인만 허용하도록 확장 가능
    // 현재는 모든 원본 허용
    callback(null, origin);
  },
  credentials: true, // 인증 정보(쿠키)를 포함하도록 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 허용할 HTTP 메서드 명시
  allowedHeaders: ['Content-Type', 'Authorization'], // 허용할 헤더 명시
}));

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
