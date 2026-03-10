import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io'; // V2 Centralized WebSockets
import winston from 'winston';
import { SyncJob } from './models/SyncJob';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Centralized Socket.io instance
export const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});

// Logger Setup
export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});


// Global Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Performance Logger Middleware
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1e6;
        if (ms > 300) {
            logger.warn(`[SLOW] ${req.method} ${req.originalUrl} - ${ms.toFixed(2)}ms`);
        }
    });
    next();
});



import movimientoRoutes from './routes/movimientos';
import woocommerceRoutes from './routes/woocommerce';
import cuentaRoutes from './routes/cuentas';
import authRoutes from './routes/auth';
import usuarioRoutes from './routes/usuarios';
import productosRoutes from './routes/productos';
import workerRoutes from './routes/worker';
import clientesRoutes from './routes/clientes';
import pedidosRoutes from './routes/pedidos';

// API Routes
app.use('/api/movimientos', movimientoRoutes);
app.use('/api/woocommerce', woocommerceRoutes);
app.use('/api/cuentas', cuentaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/pedidos', pedidosRoutes);

// Hello World Route
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'ToyoXpress API V2 Running' });
});

// Websocket Events
io.on('connection', async (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    try {
        const THIRTY_MINUTES_AGO = new Date(Date.now() - 30 * 60 * 1000);

        // Auto-expire any stuck jobs older than 30 minutes
        await SyncJob.updateMany(
            { status: { $in: ['pending', 'processing'] }, updatedAt: { $lt: THIRTY_MINUTES_AGO } },
            { $set: { status: 'completed' } }
        );

        // Only push a job to the new connection if it was recently updated (within 30 min)
        const activeJob = await SyncJob.findOne({
            status: { $in: ['pending', 'processing'] },
            updatedAt: { $gte: THIRTY_MINUTES_AGO }
        }).sort({ createdAt: -1 }).lean();

        if (activeJob) {
            socket.emit('sync_progress', {
                jobId: activeJob._id,
                totalChunks: activeJob.totalChunks,
                chunksProcessed: activeJob.chunksProcessed,
                totalSKUs: activeJob.totalSKUs,
                status: activeJob.status,
                metrics: activeJob.metrics
            });
        }
    } catch (e) {
        logger.error("Error sending initial sync state", e);
    }

    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Database Connection & Server Start
const MONGO_URI = process.env.MONGO_DEV || 'mongodb://127.0.0.1:27017/toyoxpress';
mongoose.connect(MONGO_URI)
    .then(() => {
        logger.info('Connected to MongoDB V2 Successfully');
        httpServer.listen(PORT, () => {
            logger.info(`API V2 listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        logger.error('Failed to connect to MongoDB', err);
    });
