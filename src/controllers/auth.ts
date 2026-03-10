import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_dev_only_change_me';

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body; // email field here acts as a generic identifier

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Faltan credenciales' });
            return;
        }

        const user = await User.findOne({
            $or: [
                { email: email },
                { username: email }
            ]
        });

        if (!user) {
            res.status(403).json({ success: false, message: 'Usuario y/o contraseña inválida' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password as string);
        if (!isMatch) {
            res.status(403).json({ success: false, message: 'Usuario y/o contraseña inválida' });
            return;
        }

        let effectivePermissions = user.permissions;

        // Superuser override: "admin" gets all permissions automatically
        if (user.username === 'admin') {
            effectivePermissions = {
                verMovimientos: true,
                verOtrosMovimientos: true,
                aprobarMovimientos: true,
                editarMovimientos: true,
                eliminarMovimientos: true,
                modificarFechas: true,
                crearUsuarios: true,
                modificarUsuarios: true,
                eliminarUsuarios: true,
                horasIngreso: true,
                obviarIngreso: true,
                configurarCuentas: true,
                consultarPrecios: true,
                verClientes: true,
                verExcel: true,
                cargarProductos: true
            };
        }

        // Generate JWT including basic user info and permissions
        const payload = {
            id: user._id,
            email: user.email,
            name: user.username,
            permissions: effectivePermissions
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

        res.status(200).json({
            success: true,
            message: 'Ingreso Correcto',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.username,
                vendedor: user.vendedor,
                permissions: effectivePermissions
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, username, password, permissions, vendedor } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'El usuario ya existe' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            email,
            username,
            password: hashedPassword,
            permissions: permissions || {}, // Fallback to schema defaults if empty
            vendedor: vendedor || 0
        });

        await newUser.save();

        const users = await User.find({}, '-password'); // Return list of all users without passwords
        res.status(201).json({ success: true, message: 'Usuario registrado exitosamente', users });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find({}, '-password');
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error("Get Users Error:", error);
        res.status(500).json({ success: false, message: 'Error obteniendo usuarios' });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        const users = await User.find({}, '-password');
        res.status(200).json({ success: true, message: 'Usuario eliminado', users });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ success: false, message: 'Error eliminando usuario' });
    }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { email, username, permissions } = req.body;

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            return;
        }

        user.email = email || user.email;
        user.username = username || user.username;
        if (permissions) {
            user.permissions = permissions;
        }

        // If they provided a new password, hash it
        if (req.body.password && req.body.password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        await user.save();
        const users = await User.find({}, '-password');
        res.status(200).json({ success: true, message: 'Usuario actualizado', users });
    } catch (error) {
        console.error("Update User Error:", error);
        res.status(500).json({ success: false, message: 'Error actualizando usuario' });
    }
};
