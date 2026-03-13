import mongoose, { Schema, Document } from 'mongoose';

export interface IDiaHorario {
    dia: string;
    cerrado: boolean;
    apertura: string;
    cierre: string;
}

export interface IConfiguracion extends Document {
    horario: IDiaHorario[];
    temaLocal: 'light' | 'dark' | 'system';
}

const DiaHorarioSchema = new Schema<IDiaHorario>({
    dia: { type: String, required: true },
    cerrado: { type: Boolean, default: false },
    apertura: { type: String, default: '08:00' },
    cierre: { type: String, default: '17:00' }
}, { _id: false });

const ConfiguracionSchema: Schema = new Schema({
    horario: {
        type: [DiaHorarioSchema],
        default: [
            { dia: 'Lunes', cerrado: false, apertura: '08:00', cierre: '17:00' },
            { dia: 'Martes', cerrado: false, apertura: '08:00', cierre: '17:00' },
            { dia: 'Miércoles', cerrado: false, apertura: '08:00', cierre: '17:00' },
            { dia: 'Jueves', cerrado: false, apertura: '08:00', cierre: '17:00' },
            { dia: 'Viernes', cerrado: false, apertura: '08:00', cierre: '17:00' },
            { dia: 'Sábado', cerrado: false, apertura: '08:00', cierre: '12:00' },
            { dia: 'Domingo', cerrado: true, apertura: '00:00', cierre: '00:00' }
        ]
    },
    temaLocal: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
    }
}, {
    timestamps: true
});

export const Configuracion = mongoose.models.Configuracion || mongoose.model<IConfiguracion>('Configuracion', ConfiguracionSchema);
