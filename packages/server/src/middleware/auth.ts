import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { Permission, User } from '@tcc/shared';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      correlationId?: string;
    }
  }
}

export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = authService.getUserById(decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User is not active or not found' });
    }

    req.user = user;
    next();
  };
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAll = permissions.every((p) => req.user!.permissions.includes(p));
    if (!hasAll) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        required: permissions,
      });
    }

    next();
  };
}
