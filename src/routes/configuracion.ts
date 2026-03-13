import express from 'express';
import { getConfiguracion, updateConfiguracion } from '../controllers/configuracion';
import { validateJwt, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(validateJwt);

router.get('/', getConfiguracion);
router.put('/', requirePermission('horasIngreso'), updateConfiguracion);

export default router;
