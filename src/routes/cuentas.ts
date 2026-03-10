import { Router } from 'express';
import { getCuentas, createCuenta, updateCuenta, deleteCuenta } from '../controllers/cuentas';
import { validateJwt, requirePermission } from '../middleware/auth';

const router = Router();

// /api/cuentas
router.use(validateJwt);

// Everyone with a JWT can read (to populate dropdowns in Moves)
router.get('/', getCuentas);

// Only admins with 'configurarCuentas' can modify
router.post('/', requirePermission('configurarCuentas'), createCuenta);
router.put('/:id', requirePermission('configurarCuentas'), updateCuenta);
router.delete('/:id', requirePermission('configurarCuentas'), deleteCuenta);

export default router;
