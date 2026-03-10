import { Request, Response } from 'express';
import { encolarPedido, reservarStock, verificarReservas, procesarPedido } from '../services/PedidoService';
import { Pedido } from '../models/Pedido';

// @route   POST /api/pedidos
// @desc    Crea un pedido, reserva stock y lo encola en SQS
// @access  Privado (JWT)
export const crearPedido = async (req: Request, res: Response) => {
    try {
        const payload = req.body.data || req.body;
        const vendedorId: string = (req as any).user?.id || 'unknown';

        if (!payload?.cliente || !payload?.productos?.length) {
            return res.status(400).json({ success: false, message: 'Payload inválido: se requiere cliente y al menos un producto.' });
        }

        // Reserve stock for each product (30-minute soft lock)
        for (const p of payload.productos) {
            await reservarStock(p.codigo, p.cantidad, vendedorId);
        }

        const pedido = await encolarPedido(payload, vendedorId);

        return res.status(200).json({
            success: true,
            message: 'Pedido encolado exitosamente.',
            pedidoId: pedido._id,
            estado: pedido.estado,
        });

    } catch (error: any) {
        console.error('❌ Error en crearPedido:', error);
        return res.status(500).json({ success: false, message: error.message || 'Error al crear el pedido.' });
    }
};

// @route   GET /api/pedidos
// @desc    Lista paginada de pedidos del usuario autenticado
// @access  Privado (JWT)
export const getPedidos = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const vendedorId: string = (req as any).user?.id || 'unknown';

        const total = await Pedido.countDocuments({ vendedorId });
        const pedidos = await Pedido.find({ vendedorId })
            .sort({ creadoEn: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: pedidos,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Error al obtener pedidos.' });
    }
};

// @route   POST /api/worker/procesar-pedido
// @desc    Endpoint llamado por AWS Lambda (SQS pedidos) para procesar el pipeline completo
// @access  Worker Key only
export const procesarColaPedido = async (req: Request, res: Response) => {
    // Respond immediately (Lambda timeout protection)
    res.status(200).json({ success: true, message: 'Pedido recibido para procesamiento en background.' });

    const { pedidoId } = req.body;
    if (!pedidoId) return;

    // Fire-and-forget background processing
    procesarPedido({ pedidoId }).catch(err => {
        console.error('❌ Error asíncrono procesarPedido:', err);
    });
};
