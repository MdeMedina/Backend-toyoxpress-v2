import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { Pedido, IPedidoPayload } from '../models/Pedido';
import { Reserva } from '../models/Reserva';
import { Cliente } from '../models/Cliente';
import { getNextCorrelativo } from '../models/Correlativo';
import { logger, io } from '../index';

// SQS client is created lazily inside encolarPedido() so env vars are
// guaranteed to be loaded before the credentials are read.

// ─── Enqueue ─────────────────────────────────────────────────────────────────

export async function encolarPedido(payload: IPedidoPayload, vendedorId: string) {
    const pedido = await Pedido.create({ estado: 'pendiente', payload, vendedorId, creadoEn: new Date() });

    const message = { pedidoId: pedido._id.toString(), ts: Date.now() };

    // Create SQS client lazily so AWS env vars are already loaded by dotenv
    const sqs = new SQSClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID_DEV || process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_DEV || process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    });

    try {
        const out = await sqs.send(new SendMessageCommand({
            QueueUrl: process.env.SQS_PEDIDOS_QUEUE_URL || '',
            MessageBody: JSON.stringify(message),
            MessageGroupId: vendedorId,
            MessageDeduplicationId: pedido._id.toString(),
        }));
        pedido.sqsMessageId = out.MessageId;
        await pedido.save();
        logger.info(`✅ Pedido encolado: ${pedido._id} → SQS msgId: ${out.MessageId}`);
        return pedido;
    } catch (err: any) {
        pedido.estado = 'error';
        pedido.error = String(err);
        await pedido.save();
        throw err;
    }
}

// ─── Stock helpers ────────────────────────────────────────────────────────────

async function actualizarStock(codigo: string, cantidad: number) {
    // Resolve to the local Producto collection (Código field)
    const { Producto } = await import('../models/Producto');
    await Producto.findOneAndUpdate(
        { sku: codigo },
        { $inc: { 'Existencia Actual': -cantidad } }
    );
}

async function cancelarReservas(codigoProducto: string, idUsuario: string) {
    await Reserva.deleteMany({ codigoProducto, idUsuario });
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generarPDFBuffer(
    cliente: Record<string, any>,
    productos: IPedidoPayload['productos'],
    total: number,
    correlativo: number,
    vendedor: string,
    hora: string
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ── Header ──
        doc.fontSize(16).font('Helvetica-Bold').text('ToyoXpress', 40, 40);
        doc.fontSize(11).font('Helvetica').text(`Pedido #${correlativo}`, 40, 60);
        doc.text(`Fecha: ${hora || new Date().toLocaleString('es-VE')}`, 40, 75);
        doc.text(`Vendedor: ${vendedor}`, 40, 90);

        doc.moveTo(40, 108).lineTo(555, 108).stroke();

        // ── Client info ──
        doc.fontSize(10).font('Helvetica-Bold').text('Datos del Cliente', 40, 116);
        doc.font('Helvetica').fontSize(9);
        doc.text(`Razón Social: ${cliente.Nombre || ''}`, 40, 130);
        doc.text(`RIF: ${cliente.Rif || ''}`, 40, 143);
        doc.text(`Teléfono: ${cliente.Telefonos || ''}`, 40, 156);
        if (cliente['Correo Electronico']) {
            doc.text(`Correo: ${cliente['Correo Electronico']}`, 40, 169);
        }

        doc.moveTo(40, 185).lineTo(555, 185).stroke();

        // ── Products table header ──
        const tableTop = 195;
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('Código', 40, tableTop, { width: 80 });
        doc.text('Descripción', 120, tableTop, { width: 190 });
        doc.text('Marca', 310, tableTop, { width: 70 });
        doc.text('Cant.', 380, tableTop, { width: 40 });
        doc.text('P.U.', 420, tableTop, { width: 55 });
        doc.text('Total', 475, tableTop, { width: 70 });
        doc.moveTo(40, tableTop + 12).lineTo(555, tableTop + 12).stroke();

        // ── Product rows ──
        let y = tableTop + 18;
        doc.font('Helvetica').fontSize(7.5);
        for (const p of productos) {
            doc.text(p.codigo, 40, y, { width: 80 });
            doc.text(p.nombre, 120, y, { width: 190 });
            doc.text(p.marca || '', 310, y, { width: 70 });
            doc.text(String(p.cantidad), 380, y, { width: 40 });
            doc.text(p.precio.toFixed(2), 420, y, { width: 55 });
            doc.text(p.total.toFixed(2), 475, y, { width: 70 });
            y += 14;
            if (y > 720) { doc.addPage(); y = 40; }
        }

        // ── Totals ──
        doc.moveTo(40, y + 4).lineTo(555, y + 4).stroke();
        doc.fontSize(10).font('Helvetica-Bold').text(`Total: $${total.toFixed(2)}`, 40, y + 12);
        doc.text(`Líneas: ${productos.length}`, 300, y + 12);
        doc.text(`Items: ${productos.reduce((s, p) => s + p.cantidad, 0)}`, 430, y + 12);

        doc.end();
    });
}

// ─── Mailer ───────────────────────────────────────────────────────────────────

async function enviarEmails(pdfBuffer: Buffer, correlativo: number, clienteNombre: string, notaCorreo: string, extraEmails: string[]) {
    if (!process.env.SMTP_HOST) {
        logger.warn('⚠️  SMTP no configurado — email omitido.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    // Build recipients: fixed CC + dynamic extras
    const fixed = (process.env.EMAIL_CC || 'pedidostoyoxpress@gmail.com,hectorumerez@gmail.com,toyoxpressca@gmail.com')
        .split(',').map(s => s.trim()).filter(Boolean);
    const all = [...new Set([...fixed, ...extraEmails])];

    const subject = `Pedido #${correlativo} — ${clienteNombre}`;
    const text = `${notaCorreo || ''}\n\nPedido #${correlativo} para ${clienteNombre}`;

    for (const to of all) {
        try {
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to,
                subject,
                text,
                attachments: [{ filename: `Pedido_${correlativo}.pdf`, content: pdfBuffer }],
            });
            logger.info(`📧 Email enviado → ${to}`);
        } catch (e: any) {
            logger.error(`❌ Email falló → ${to}:`, e.message);
        }
    }
}

// ─── Main Worker Pipeline ─────────────────────────────────────────────────────

export async function procesarPedido({ pedidoId }: { pedidoId: string }) {
    // Step 1: Lock the order (prevent double-processing)
    const pedido = await Pedido.findOneAndUpdate(
        { _id: pedidoId, estado: { $in: ['pendiente', 'procesando'] } },
        { estado: 'procesando' },
        { new: true }
    );

    if (!pedido) {
        logger.warn(`[PedidoWorker] Pedido ${pedidoId} no encontrado o ya procesado.`);
        return;
    }

    const { cliente, vendedor, productos, total, notaPedido, notaCorreo, emails, hora } = pedido.payload;

    try {
        // Step 2: Atomic correlativo
        const correlativo = await getNextCorrelativo();
        logger.info(`[PedidoWorker] Procesando pedido ${pedidoId} — Correlativo #${correlativo}`);

        // Step 3: Create order in WooCommerce (proper await — throws on failure)
        const WooCommerce = new WooCommerceRestApi({
            url: process.env.WC_URL || '',
            consumerKey: process.env.WC_CONSUMER_KEY || '',
            consumerSecret: process.env.WC_CONSUMER_SECRET || '',
            version: 'wc/v3',
            queryStringAuth: true,
        });

        // Resolve WooCommerce product IDs from SKU
        const lineItems: any[] = [];
        for (const p of productos) {
            try {
                const res = await WooCommerce.get(`products?sku=${p.codigo}`);
                if (res.data?.length > 0) {
                    lineItems.push({ product_id: res.data[0].id, quantity: p.cantidad });
                }
            } catch { /* skip unresolvable SKUs */ }
        }

        // Email for billing (from cliente + extras)
        const extractEmails = (raw: string) => raw.split(/[\s;,]+/).filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
        const clienteEmail = cliente['Correo Electronico'] ? extractEmails(cliente['Correo Electronico'])[0] : '';

        const orderPayload: any = {
            billing: { first_name: cliente.Nombre, email: clienteEmail, phone: cliente.Telefonos, address_1: cliente.Direccion, state: cliente.Estado, city: cliente.Ciudad },
            shipping: { first_name: cliente.Nombre, address_1: cliente.Direccion, state: cliente.Estado, city: cliente.Ciudad },
            line_items: lineItems,
            status: 'pedidoapp',
            customer_note: notaPedido || '',
            meta_data: [{ key: '_numero_pedido_app', value: String(correlativo) }],
        };
        if (cliente['Tipo de Precio'] === 'Precio Oferta') orderPayload.apply_role = 'cliente2';

        // ← If this throws, the catch block marks the order as 'error' and stock is NOT touched
        await WooCommerce.post('orders', orderPayload);
        logger.info(`[PedidoWorker] Orden WooCommerce creada — Correlativo #${correlativo}`);

        // Step 4: Generate single PDF buffer (shared for email + archive)
        const pdfBuffer = await generarPDFBuffer(cliente, productos, total, correlativo, vendedor, hora || new Date().toLocaleString('es-VE'));

        // Step 5: Send emails (non-blocking per recipient)
        const extraEmails = emails || [];
        if (clienteEmail) extraEmails.push(clienteEmail);
        await enviarEmails(pdfBuffer, correlativo, cliente.Nombre, notaCorreo || '', extraEmails);

        // Step 6: Decrement stock (only after WooCommerce success)
        await Promise.all(productos.map(p => actualizarStock(p.codigo, p.cantidad)));

        // Step 7: Cancel reservations
        await Promise.all(productos.map(p => cancelarReservas(p.codigo, vendedor)));

        // Step 8: Finalize
        pedido.estado = 'completado';
        pedido.correlativo = correlativo;
        pedido.procesadoEn = new Date();
        await pedido.save();

        // Notify all connected frontend clients in real time
        io.emit('pedido_completado', {
            pedidoId: pedido._id.toString(),
            correlativo,
            cliente: cliente.Nombre,
            total: pedido.payload.total,
            vendedor: vendedor,
        });

        logger.info(`✅ [PedidoWorker] Pedido ${pedidoId} completado — #${correlativo}`);
        return { ok: true, correlativo };

    } catch (err: any) {
        pedido.estado = 'error';
        pedido.error = err.message || String(err);
        await pedido.save();
        logger.error(`❌ [PedidoWorker] Pedido ${pedidoId} falló:`, err);
        throw err;
    }
}

// ─── Reserva helpers (used by the pedidos controller) ────────────────────────

export async function reservarStock(codigoProducto: string, cantidad: number, idUsuario: string) {
    const reservadaHasta = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await Reserva.create({ codigoProducto, cantidad, reservadaHasta, idUsuario });
}

export async function verificarReservas(codigoProducto: string) {
    return Reserva.find({ codigoProducto, reservadaHasta: { $gt: new Date() } });
}
