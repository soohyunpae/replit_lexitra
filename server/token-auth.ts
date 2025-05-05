import { Express, NextFunction, Request, Response } from 'express';
import { User } from '../shared/schema';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// Use a secret that's randomly generated on server start
// In production, this should be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');

// Token expiration time (24 hours)
const TOKEN_EXPIRATION = '24h';

// Interface for JWT payload
export interface JwtPayload {
  id: number;
  username: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: { id: number; username: string; role?: string }): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION }
  );
}

/**
 * Middleware to verify JWT token from Authorization header
 */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  // Get token from Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Attach user info to request object
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    
    // Continue to the route handler
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Setup token-based authentication routes
 */
export function setupTokenAuth(app: Express) {
  // Middleware to log authentication details
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.log(`[AUTH DEBUG ${req.path}]`, {
        method: req.method,
        path: req.path,
        hasAuthHeader: !!req.headers.authorization,
        hasUser: !!req.user
      });
    }
    next();
  });

  // Helper function to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };

  // Protect routes that require authentication
  app.get('/api/user', verifyToken, (req: Request, res: Response) => {
    return res.json(req.user);
  });

  app.get('/api/profile', verifyToken, (req: Request, res: Response) => {
    return res.json(req.user);
  });

  // Add verifyToken middleware to other protected routes as needed
}
