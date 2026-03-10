import mongoose, { Schema, Document } from 'mongoose';

export interface IReserva extends Document {
    codigoProducto: string;
    cantidad: number;
    reservadaHasta: Date;
    idUsuario: string;
}

const ReservaSchema = new Schema<IReserva>({
    codigoProducto: { type: String, required: true, index: true },
    cantidad: { type: Number, required: true },
    // 30-minute soft lock — Mongoose TTL auto-expires documents
    reservadaHasta: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    idUsuario: { type: String, required: true },
});

export const Reserva = mongoose.model<IReserva>('Reserva', ReservaSchema);
