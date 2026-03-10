import { Router } from 'express';
import { uploadClientes, getClientes } from '../controllers/clientes';
import { validateJwt } from '../middleware/auth';

const router = Router();

// /api/clientes — all routes require authentication
router.use(validateJwt);

router.get('/', getClientes);
router.post('/upload', uploadClientes);

export default router;
