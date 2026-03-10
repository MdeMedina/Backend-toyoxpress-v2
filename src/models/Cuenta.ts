import mongoose, { Schema, Document } from 'mongoose';

export interface ICuenta extends Document {
    value: string;
    label: string;
    color: string;
    saldo: boolean;
    disabled?: boolean;
}

const CuentaSchema: Schema = new Schema({
    value: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, default: '#000000' },
    saldo: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
});

export const Cuenta = mongoose.models.Cuenta || mongoose.model<ICuenta>('Cuenta', CuentaSchema, 'cuentas');
