
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function seed() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/toyoxpress');
        console.log('Connected to DB');

        const db = mongoose.connection.db;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        await db.collection('users').updateOne(
            { username: 'admin' },
            {
                $set: {
                    email: 'admin@toyoxpress.com',
                    password: hashedPassword,
                    vendedor: 0,
                    permissions: {
                        verMovimientos: true,
                        aprobarMovimientos: true,
                        eliminarMovimientos: true,
                        modificarFechas: true,
                        editarMovimientos: true,
                        verOtrosMovimientos: true,
                        modificarUsuarios: true,
                        eliminarUsuarios: true,
                        crearUsuarios: true,
                        horasIngreso: true,
                        obviarIngreso: true,
                        configurarCuentas: true,
                        consultarPrecios: true,
                        verClientes: true,
                        verExcel: true
                    }
                }
            },
            { upsert: true }
        );

        console.log("Admin user created/updated successfully with password: 'admin123'");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seed();
