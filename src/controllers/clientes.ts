import { Request, Response } from 'express';
import { Cliente } from '../models/Cliente';

// @route   POST /api/clientes/upload
// @desc    BulkWrite upsert de clientes desde Excel (deduplica por Rif)
// @access  Privado (JWT)
export const uploadClientes = async (req: Request, res: Response) => {
    try {
        const { data } = req.body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'No se enviaron datos de clientes.' });
        }

        // Map Excel columns preserving V1 field names (as stored in MongoDB)
        const mapped = data.map((row: any) => ({
            Rif: String(row['Rif'] || row['RIF'] || '').trim(),
            Nombre: String(row['Nombre'] || '').trim(),
            Vendedor: String(row['Vendedor'] || '').trim(),
            Telefonos: String(row['Telefonos'] || row['Teléfonos'] || '').trim(),
            'Correo Electronico': String(row['Correo Electronico'] || row['Correo Electrónico'] || '').trim(),
            'Tipo de Precio': String(row['Tipo de Precio'] || '').trim(),
            Estado: String(row['Estado'] || '').trim(),
            Ciudad: String(row['Ciudad'] || '').trim(),
            Municipio: String(row['Municipio'] || '').trim(),
            Direccion: String(row['Direccion'] || row['Dirección'] || '').trim(),
            'Vendedores Codigo': String(row['Vendedores Código'] || row['Vendedores Codigo'] || '').trim(),
            'Ultima Venta Credito': String(row['Ultima Venta Credito'] || row['Última Venta Crédito'] || '').trim(),
        })).filter((c: any) => c.Rif && c.Nombre);

        if (mapped.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo leer ninguna fila válida. Revisa que el Excel tenga columnas Rif y Nombre.'
            });
        }

        const bulkOps = mapped.map((c: any) => ({
            updateOne: {
                filter: { Rif: c.Rif },
                update: { $set: c },
                upsert: true,
            },
        }));

        const result = await Cliente.bulkWrite(bulkOps);

        return res.status(200).json({
            success: true,
            message: 'Clientes cargados exitosamente.',
            total: mapped.length,
            inserted: result.upsertedCount,
            updated: result.modifiedCount,
        });

    } catch (error: any) {
        console.error('❌ Error en uploadClientes:', error);
        return res.status(500).json({ success: false, message: error.message || 'Error al procesar el archivo.' });
    }
};

// @route   GET /api/clientes
// @desc    Lista paginada de clientes con búsqueda por nombre o RIF
// @access  Privado (JWT)
export const getClientes = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = (req.query.search as string) || '';

        const query: any = {};
        if (search) {
            query.$or = [
                { Nombre: { $regex: search, $options: 'i' } },
                { Rif: { $regex: search, $options: 'i' } },
                { Ciudad: { $regex: search, $options: 'i' } },
            ];
        }

        const total = await Cliente.countDocuments(query);
        const clientes = await Cliente.find(query)
            .sort({ Nombre: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: clientes,
        });

    } catch (error: any) {
        console.error('❌ Error en getClientes:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener clientes.' });
    }
};
