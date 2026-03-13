import { Request, Response, NextFunction } from 'express';
import { Configuracion } from '../models/Configuracion';

export const verificarHorario = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;

        // Si no hay usuario definido (rutas no autenticadas que usen esto) o si tiene el permiso, lo dejamos pasar
        if (!user || user.permissions?.obviarIngreso) {
            return next();
        }

        const config = await Configuracion.findOne();
        if (!config || !config.horario) {
            return next(); // Si por casualidad la bd no tiene conf, dejar pasar
        }

        const now = new Date();
        const formatter = new Intl.DateTimeFormat('es-VE', {
            timeZone: 'America/Caracas',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(now);

        let currentDayStr = '';
        let currentHour = 0;
        let currentMin = 0;

        for (const part of parts) {
            if (part.type === 'weekday') currentDayStr = part.value;
            if (part.type === 'hour') currentHour = parseInt(part.value, 10);
            if (part.type === 'minute') currentMin = parseInt(part.value, 10);
        }

        const dayMap: Record<string, string> = {
            'lunes': 'Lunes', 'martes': 'Martes', 'miércoles': 'Miércoles',
            'jueves': 'Jueves', 'viernes': 'Viernes', 'sábado': 'Sábado', 'domingo': 'Domingo'
        };
        const dayKey = dayMap[currentDayStr.toLowerCase()] || 'Lunes';
        const todaySchedule = config.horario.find((h: any) => h.dia === dayKey);

        if (todaySchedule) {
            if (todaySchedule.cerrado) {
                return res.status(403).json({ success: false, message: 'La tienda se encuentra cerrada el día de hoy.' });
            }

            const [openH, openM] = todaySchedule.apertura.split(':').map(Number);
            const [closeH, closeM] = todaySchedule.cierre.split(':').map(Number);

            const nowMins = currentHour * 60 + currentMin;
            const openMins = (openH || 0) * 60 + (openM || 0);
            const closeMins = (closeH || 23) * 60 + (closeM || 59);

            const isOvernight = closeMins < openMins;

            let isOpen = false;
            if (isOvernight) {
                isOpen = nowMins >= openMins || nowMins <= closeMins;
            } else {
                isOpen = nowMins >= openMins && nowMins <= closeMins;
            }

            if (!isOpen) {
                return res.status(403).json({ success: false, message: `La tienda opera de ${todaySchedule.apertura} a ${todaySchedule.cierre}. Vuelva en ese horario.` });
            }
        }

        next();
    } catch (error) {
        console.error("Error validando horario en middleware:", error);
        next(); // Fall open en caso de error interno para no romper toda la app
    }
};
