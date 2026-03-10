import { Router } from 'express';
import { createMovimiento, getMovimientos, aprobarMovimiento, getUsuariosDistintos, updateMovimiento, deleteMovimiento } from '../controllers/movimientos';
import { validateJwt, requirePermission } from '../middleware/auth';

const router = Router();

// Require authentication for all movement routes
router.use(validateJwt);

// /api/movimientos
router.get('/usuarios', getUsuariosDistintos);
router.post('/', createMovimiento);
router.get('/', getMovimientos);
router.put('/:id/aprobar', requirePermission('aprobarMovimientos'), aprobarMovimiento);
router.put('/:id', updateMovimiento);
router.delete('/:id', deleteMovimiento);

export default router;
