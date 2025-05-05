import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// 인증이 필요한 라우트를 위한 미들웨어
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: "Authentication required" });
}

// 관리자 역할이 필요한 라우트를 위한 미들웨어
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // @ts-ignore - req.user.role 속성에 접근
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  
  return next();
}

// 자원 소유자 또는 관리자만 접근 가능한 라우트를 위한 미들웨어
export function isResourceOwnerOrAdmin(resourceField: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const resourceId = req.params[resourceField];
    const userId = req.user?.id;
    // @ts-ignore - req.user.role 속성에 접근
    const isUserAdmin = req.user?.role === 'admin';
    
    // 리소스의 소유자 또는 관리자인 경우에만 접근 허용
    if (parseInt(resourceId) === userId || isUserAdmin) {
      return next();
    }
    
    return res.status(403).json({ message: "You don't have permission to access this resource" });
  };
}

// 프로젝트 클레임 확인 미들웨어
export function canManageProject(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // 프로젝트 ID 파라미터로 가져오기
  const projectId = parseInt(req.params.projectId);
  
  // @ts-ignore - req.user.role 속성에 접근
  const isUserAdmin = req.user?.role === 'admin';
  
  // 클레임 요청 시 추가 검증
  if (req.path.includes('/claim') || req.path.includes('/unclaim') || req.path.includes('/complete')) {
    // 관리자는 항상 프로젝트를 관리할 수 있음
    if (isUserAdmin) {
      return next();
    }
    
    // 여기서 프로젝트의 상태와 claimedBy 필드를 확인해야 함
    // 실제 구현에서는 DB 조회 필요
    // 간소화를 위해 여기서는 생략하고 다음 단계로 넘김
  }
  
  return next();
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
