import { Router } from 'express';
import { getUsers, updateUser, deleteUser, registerUser } from '../controllers/auth';
import { validateJwt, requirePermission } from '../middleware/auth';

const router = Router();

// Apply JWT validation to all user management routes
router.use(validateJwt);

// User CRUD operations protected by specific permissions
// Note: We map 'crearUsuarios' to POST, 'modificarUsuarios' to PUT, etc.
router.get('/', requirePermission('crearUsuarios'), getUsers); // Assuming if you can create, you can list. Or we could use another permission like 'modificarUsuarios'
router.post('/', requirePermission('crearUsuarios'), registerUser);
router.put('/:id', requirePermission('modificarUsuarios'), updateUser);
router.delete('/:id', requirePermission('eliminarUsuarios'), deleteUser);

export default router;
