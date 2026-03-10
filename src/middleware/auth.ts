import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_dev_only_change_me';

// Extend Express Request object to include user data
export interface AuthRequest extends Request {
    user?: any;
}

export const validateJwt = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Autenticación requerida (Falta token)' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
};

/**
 * Validates if the user's JWT payload contains a specific permission set to true.
 * Returns 403 Forbidden if they lack it. 
 */
export const requirePermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        const user = req.user;

        if (!user || !user.permissions) {
            res.status(403).json({ success: false, message: 'Acceso denegado: Fallo en permisos.' });
            return;
        }

        // SuperAdmin bypass
        if (user.name === 'admin') {
            next();
            return;
        }

        if (user.permissions[permission] !== true) {
            // If they don't have the specific permission requested
            res.status(403).json({
                success: false,
                message: `Acceso denegado: Necesitas el permiso '${permission}' para esta acción.`
            });
            return;
        }

        // Permission granted
        next();
    };
};

export const validateWorkerKey = (req: Request, res: Response, next: NextFunction): void => {
    const workerKey = req.headers['x-worker-key'];
    // FIXED: En el .env se llama WORKER_API_KEY, no WORKER_KEY
    const expectedKey = process.env.WORKER_API_KEY || 'super_secret_toyoxpress_sqs_key';

    if (!workerKey || workerKey !== expectedKey) {
        res.status(403).json({ success: false, message: 'Forbidden: Invalid Worker Key' });
        return;
    }

    next();
};
