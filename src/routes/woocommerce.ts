import { Router } from 'express';
import { syncWooCommerceProducts } from '../controllers/woocommerce';

const router = Router();

// /api/woocommerce/sync-products
router.post('/sync-products', syncWooCommerceProducts);

export default router;
