/**
 * Script de prueba SMTP — Brevo
 * Ejecutar: npx tsx scripts/test-smtp.ts
 */
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const HOST = process.env.SMTP_HOST || '';
const PORT = Number(process.env.SMTP_PORT || 587);
const SECURE = process.env.SMTP_SECURE === 'true';
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const TO = process.argv[2] || USER; // destinatario de prueba (o pasa uno como arg)

console.log('\n📧 TEST SMTP BREVO');
console.log('─────────────────────────────────────────');
console.log(`  Host:   ${HOST}`);
console.log(`  Port:   ${PORT}`);
console.log(`  Secure: ${SECURE}`);
console.log(`  User:   ${USER}`);
console.log(`  Pass:   ${PASS ? '✅ definida (' + PASS.slice(0, 4) + '...)' : '❌ VACÍA'}`);
console.log(`  To:     ${TO}`);
console.log('─────────────────────────────────────────\n');

async function run() {
    const transporter = nodemailer.createTransport({
        host: HOST,
        port: PORT,
        secure: SECURE,
        auth: { user: USER, pass: PASS },
    });

    // 1. Verificar auth
    console.log('1️⃣  Verificando conexión SMTP...');
    try {
        await transporter.verify();
        console.log('   ✅ Auth OK — credenciales correctas\n');
    } catch (err: any) {
        console.error('   ❌ Auth FALLIDA:', err.message);
        console.error('   Código:', err.code);
        console.error('   Respuesta del servidor:', err.response);
        console.log('\n💡 Posibles causas:');
        console.log('   • SMTP_USER debe ser el email registrado en Brevo como "From"');
        console.log('   • SMTP_PASS debe ser la API Key de Brevo (NO la contraseña de la cuenta)');
        console.log('   • En Brevo: SMTP & API → API Keys → Genera una key SMTP');
        console.log('   • Host correcto: smtp-relay.brevo.com | Port: 587 | Secure: false');
        process.exit(1);
    }

    // 2. Enviar email de prueba
    console.log(`2️⃣  Enviando email de prueba a ${TO}...`);
    try {
        const info = await transporter.sendMail({
            from: USER,
            to: TO,
            subject: '✅ Test SMTP ToyoXpress — ' + new Date().toLocaleString(),
            text: 'Si recibes este correo, el SMTP está funcionando correctamente.',
            html: '<h2>✅ SMTP OK</h2><p>Si recibes este correo, el SMTP de ToyoXpress está funcionando correctamente.</p>',
        });
        console.log('   ✅ Email enviado!');
        console.log('   Message ID:', info.messageId);
        console.log('   Respuesta servidor:', info.response);
    } catch (err: any) {
        console.error('   ❌ Envío fallido:', err.message);
        console.error('   Respuesta:', err.response);
    }
}

run();
