const mongoose = require('mongoose');
require('dotenv').config({ path: '/Users/MiguelMedina/Desktop/Miguel/toyoxpress/Backend-toyoxpress-v2/.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const movimientos = db.collection('movimientos');

    // get oldest 5
    const oldest = await movimientos.find({}).sort({ id: 1 }).limit(5).toArray();
    console.log("Oldest 5 by id:", oldest.map(o => ({ id: o.id, identificador: o.identificador, fecha: o.fecha, creado: o.creado, fechaString: o.fechaString, monto: o.monto })));

    // get newest 5
    const newest = await movimientos.find({}).sort({ id: -1 }).limit(5).toArray();
    console.log("Newest 5 by id:", newest.map(o => ({ id: o.id, identificador: o.identificador, fecha: o.fecha, creado: o.creado, fechaString: o.fechaString, monto: o.monto })));

    console.log("Total Count:", await movimientos.countDocuments());
  } catch (e) {
    console.error(e)
  }
  process.exit(0);
}
run();
