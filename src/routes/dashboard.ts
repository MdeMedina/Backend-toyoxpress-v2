import express from 'express';
import { getDashboardStats } from '../controllers/dashboard';
import { validateJwt } from '../middleware/auth';

const router = express.Router();

router.use(validateJwt);

router.get('/stats', getDashboardStats);

export default router;
