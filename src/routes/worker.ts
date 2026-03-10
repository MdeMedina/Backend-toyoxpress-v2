import { Router } from "express";
import { handleSQSProductMessage } from "../controllers/worker";
import { procesarColaPedido } from "../controllers/pedidos";
import { validateWorkerKey } from "../middleware/auth";

const router = Router();

// /api/worker — protected by Worker Key (Lambda only)
router.use(validateWorkerKey);

// Products sync chunk from SQS Lambda
router.post("/process-products", handleSQSProductMessage);

// Pedido processing from SQS Lambda (pedidos queue)
router.post("/procesar-pedido", procesarColaPedido);

export default router;
