import { Request, Response } from 'express';
import { Producto } from '../models/Producto';
import { logger } from '../index';

export const syncWooCommerceProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        // Array of products typically received from WooCommerce via Webhook/Batch
        const productsFromWoo: any[] = req.body.products || [];

        if (!Array.isArray(productsFromWoo) || productsFromWoo.length === 0) {
            res.status(400).json({ success: false, message: 'Array de productos inválido o vacío' });
            return;
        }

        logger.info(`V2 WooCommerce Sync: Procesando ${productsFromWoo.length} productos.`);

        // FIX: Dangerous `deleteMany({})` replaced by `bulkWrite()` (Upsert logic).
        // This allows keeping the existing products if something fails mid-way, and only updates/inserts matching SKUs.
        const bulkOps = productsFromWoo.map((prod) => ({
            updateOne: {
                filter: { sku: prod.sku }, // Or id_wc: prod.id
                update: {
                    $set: {
                        id_wc: prod.id,
                        name: prod.name,
                        sku: prod.sku,
                        price: Number(prod.price || 0),
                        regular_price: Number(prod.regular_price || 0),
                        sale_price: Number(prod.sale_price || 0),
                        stock_quantity: prod.stock_quantity || 0,
                        stock_status: prod.stock_status,
                        status: prod.status,
                        categories: prod.categories,
                        images: prod.images,
                        attributes: prod.attributes
                    }
                },
                upsert: true // Insert if it doesn't exist, update if it does
            }
        }));

        // Ejecuta las operaciones en bloque de forma segura
        const result = await Producto.bulkWrite(bulkOps);

        logger.info(`V2 WooCommerce Sync completado. Insertados: ${result.upsertedCount}, Modificados: ${result.modifiedCount}`);

        res.status(200).json({
            success: true,
            message: 'Sincronización segura por lotes exitosa',
            stats: {
                upserted: result.upsertedCount,
                modified: result.modifiedCount
            }
        });
    } catch (error: any) {
        logger.error('Error sincronizando WooCommerce V2', error);
        res.status(500).json({ success: false, message: 'Error en sincronización segura' });
    }
};
