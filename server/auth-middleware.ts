import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import jwt from 'jsonwebtoken';
import { JwtPayload } from './token-auth';

// JWT 시크릿 키
const JWT_SECRET = process.env.JWT_SECRET || 'lexitra_jwt_secret_key';

// 인증이 필요한 라우트를 위한 미들웨어 (세션 또는 토큰 인증 지원)
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log('[SESSION DEBUG]', {
    authenticated: req.isAuthenticated(),
    sessionID: req.sessionID,
    session: req.session,
    cookies: req.cookies,
    user: req.user
  });
  
  console.log('[AUTH DEBUG ' + req.path + ']', {
    method: req.method,
    path: req.path,
    hasAuthHeader: !!req.headers.authorization,
    hasUser: !!req.user
  });
  
  // 세션 기반 인증 확인
  if (req.isAuthenticated()) {
    console.log('[AUTH] Session-based authentication successful');
    return next();
  }
  
  // 토큰 기반 인증 시도
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer 토큰 형식 추출
  
  if (token) {
    try {
      // JWT 토큰 검증
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      
      // 사용자 정보를 요청 객체에 첨부
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
      
      console.log('[AUTH] Token-based authentication successful', { userId: decoded.id });
      return next();
    } catch (error) {
      console.error('[AUTH] Token verification error:', error);
    }
  }
  
  // 템플릿 관련 API는 인증 없이도 접근 허용 (임시적인 예외)
  if (req.path.includes('/templates')) {
    console.log('[AUTH] Bypassing authentication for templates API');
    return next();
  }
  
  // 인증 실패
  console.log('[AUTH] Authentication failed');
  return res.status(401).json({ error: "인증 정보가 유효하지 않습니다." });
}

// 관리자 역할이 필요한 라우트를 위한 미들웨어
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  // 먼저 인증 확인
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // 사용자 역할 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  
  return next();
}

// TM 및 Glossary 관리 권한 확인 미들웨어
export function canManageTMAndGlossary(req: Request, res: Response, next: NextFunction) {
  // 먼저 인증 확인
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // GET 요청은 모든 인증된 사용자에게 허용 (읽기)
  if (req.method === 'GET') {
    return next();
  }
  
  // POST, PUT, DELETE 등 수정 요청은 관리자만 가능
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin privileges required to modify TM or Glossary entries" });
  }
  
  return next();
}

// 자원 소유자 또는 관리자만 접근 가능한 라우트를 위한 미들웨어
export function isResourceOwnerOrAdmin(resourceField: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 인증 확인 - req.user가 없으면 인증 실패
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const resourceId = req.params[resourceField];
    const userId = req.user.id;
    const isUserAdmin = req.user.role === 'admin';
    
    // 리소스의 소유자 또는 관리자인 경우에만 접근 허용
    if (parseInt(resourceId) === userId || isUserAdmin) {
      return next();
    }
    
    return res.status(403).json({ message: "You don't have permission to access this resource" });
  };
}

// 프로젝트 관리 권한 확인 미들웨어
export function canManageProject(req: Request, res: Response, next: NextFunction) {
  // 인증 확인 - req.user가 없으면 인증 실패
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // 프로젝트 ID 파라미터로 가져오기
  const projectId = parseInt(req.params.projectId);
  
  // 관리자 권한 확인
  const isUserAdmin = req.user.role === 'admin';
  const userId = req.user.id; // 현재 사용자 ID
  
  // 관리자는 항상 프로젝트를 관리할 수 있음
  if (isUserAdmin) {
    return next();
  }
  
  // 단순 조회(반드시 내 프로젝트여야 할 필요가 없는 경우)
  if (req.method === 'GET' && !req.path.includes('/delete') && !req.path.includes('/claim') && 
      !req.path.includes('/unclaim') && !req.path.includes('/complete') && !req.path.includes('/reopen')) {
    return next();
  }
  
  // 나머지 경우 DB에서 프로젝트 정보를 가져와 권한 확인
  const { db } = require('@db');
  const { projects } = require('@shared/schema');
  const { eq } = require('drizzle-orm');
  
  db.query.projects.findFirst({
    where: eq(projects.id, projectId)
  }).then((project: any) => {
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // claim 작업의 경우 (Unclaimed 상태인 프로젝트만 클레임 가능)
    if (req.path.includes('/claim') && project.status === 'Unclaimed') {
      return next();
    }
    
    // unclaim, complete 작업의 경우 (본인이 클레임한 프로젝트만 처리 가능)
    if ((req.path.includes('/unclaim') || req.path.includes('/complete')) && 
        project.status === 'Claimed' && 
        project.claimedBy === userId) {
      return next();
    }
    
    // reopen 작업의 경우 (본인이 완료한 프로젝트만 다시 열기 가능)
    if (req.path.includes('/reopen') && 
        project.status === 'Completed' && 
        project.claimedBy === userId) {
      return next();
    }
    
    // 이 외의 모든 경우는 권한 거부
    return res.status(403).json({ 
      message: "You don't have permission to perform this action on this project" 
    });
  }).catch((error: any) => {
    console.error("Project permission check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  });
}

// 에러 핸들링 미들웨어
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  console.error("Error:", error);
  
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: error.errors,
    });
  }
  
  return res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "production" ? undefined : error.message,
  });
}
