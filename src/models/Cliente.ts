import mongoose, { Schema, Document } from 'mongoose';

export interface ICliente extends Document {
    Rif: string;
    Nombre: string;
    Vendedor?: string;
    Telefonos?: string;
    'Correo Electronico'?: string;
    'Tipo de Precio'?: string;
    Estado?: string;
    Ciudad?: string;
    Municipio?: string;
    Direccion?: string;
    'Vendedores Codigo'?: string;
    'Ultima Venta Credito'?: string;
}

const ClienteSchema: Schema = new Schema({
    Rif: { type: String, required: true, unique: true, index: true },
    Nombre: { type: String, required: true },
    Vendedor: { type: String },
    Telefonos: { type: String },
    'Correo Electronico': { type: String },
    'Tipo de Precio': { type: String },
    Estado: { type: String },
    Ciudad: { type: String },
    Municipio: { type: String },
    Direccion: { type: String },
    'Vendedores Codigo': { type: String },
    'Ultima Venta Credito': { type: String },
}, { timestamps: true, strict: false }); // strict: false lets legacy keys through

export const Cliente = mongoose.model<ICliente>('Cliente', ClienteSchema);
