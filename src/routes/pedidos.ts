import { Router } from 'express';
import { crearPedido, getPedidos } from '../controllers/pedidos';
import { validateJwt } from '../middleware/auth';

const router = Router();

// /api/pedidos — all routes require authentication
router.use(validateJwt);

router.get('/', getPedidos);
router.post('/', crearPedido);

export default router;
