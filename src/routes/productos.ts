import { Router } from "express";
import { uploadProducts, getProducts, getLastSync } from "../controllers/productos";
import { validateJwt, requirePermission } from "../middleware/auth";

const router = Router();

// /api/productos
router.use(validateJwt);

// Route for fetching paginated local products
router.get("/", getProducts);

// Route to get the last sync job summary (for persistent display)
router.get("/last-sync", getLastSync);

// Route for Excel Upload -> BulkWrite -> Parallel SQS Dispatch
router.post("/upload", requirePermission("configurarCuentas"), uploadProducts);

export default router;
