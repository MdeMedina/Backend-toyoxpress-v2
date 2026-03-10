import { Router } from 'express';
import { loginUser, registerUser } from '../controllers/auth';

const router = Router();

// Public Routes
router.post('/login', loginUser);

// Currently public, but could be protected later if only admins can register
router.post('/register', registerUser);

export default router;
