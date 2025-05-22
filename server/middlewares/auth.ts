import { Request, Response, NextFunction } from 'express';

// 사용자 세션 타입 확장
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      role: string;
    };
  }
}

// 인증된 사용자만 접근 가능
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user) {
    return next();
  }
  
  return res.status(401).json({ error: '로그인이 필요합니다.' });
}

// 관리자만 접근 가능
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
}