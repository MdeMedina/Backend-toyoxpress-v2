import { Request, Response } from 'express';
import { Configuracion } from '../models/Configuracion';

export const getConfiguracion = async (req: Request, res: Response) => {
    try {
        let config = await Configuracion.findOne();

        // Si no existe, creamos la configuración por defecto
        if (!config) {
            config = await Configuracion.create({});
        }

        // Devolvemos la config más la hora actual del servidor en milisegundos y hora local
        return res.status(200).json({
            success: true,
            data: config,
            serverTimeMs: Date.now(),
            serverTimeStr: new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateConfiguracion = async (req: Request, res: Response) => {
    try {
        const payload = req.body;

        let config = await Configuracion.findOne();
        if (!config) {
            config = new Configuracion();
        }

        if (payload.horario) config.horario = payload.horario;
        if (payload.temaLocal) config.temaLocal = payload.temaLocal;

        await config.save();

        return res.status(200).json({
            success: true,
            data: config,
            message: 'Configuración actualizada correctamente'
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
