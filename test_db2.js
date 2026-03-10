const mongoose = require('mongoose');
require('dotenv').config({ path: '/Users/MiguelMedina/Desktop/Miguel/toyoxpress/Backend-toyoxpress-v2/.env' });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Movimiento = mongoose.connection.db.collection('movimientos');
        // ------ V1 Logic Simulation ------
        let conditionSaldoWithArrays = {};

        const finalConditionSaldo = {
            ...conditionSaldoWithArrays,
            disabled: false,
        };

        const matchStage = { $match: finalConditionSaldo };

        const projectStage = {
            $project: {
                _id: 0,
                identificador: 1,
                monto: 1,
                cuenta: 1,
            }
        };

        const groupStage = {
            $group: {
                _id: null,
                total: {
                    $sum: {
                        $cond: [
                            { $eq: [{ $substr: ["$identificador", 0, 1] }, "I"] },
                            {
                                $cond: [
                                    { $eq: ["$cuenta", "CajaChica"] },
                                    0,
                                    { $toDouble: "$monto" }
                                ]
                            },
                            {
                                $cond: [
                                    { $eq: ["$cuenta", "CajaChica"] },
                                    0,
                                    { $multiply: [{ $toDouble: "$monto" }, -1] }
                                ]
                            }
                        ]
                    }
                },
                cajaChica: {
                    $sum: {
                        $cond: [
                            { $eq: [{ $substr: ["$identificador", 0, 1] }, "I"] },
                            {
                                $cond: [
                                    { $eq: ["$cuenta", "CajaChica"] },
                                    { $toDouble: "$monto" },
                                    0
                                ]
                            },
                            {
                                $cond: [
                                    { $eq: ["$cuenta", "CajaChica"] },
                                    { $multiply: [{ $toDouble: "$monto" }, -1] },
                                    0
                                ]
                            }
                        ]
                    }
                }
            }
        };

        const resultadoV1 = await Movimiento.aggregate([matchStage, projectStage, groupStage]).toArray();

        // ------ V2 Logic Simulation ------
        const queryTotals = {}; // no dates, no specific filters unless "todos"
        const isIngresoCond = {
            $or: [
                { $eq: [{ $substr: ["$identificador", 0, 1] }, "I"] },
                { $eq: ["$movimiento", "ingreso"] }
            ]
        };

        const resultadoV2 = await Movimiento.aggregate([
            // { $match: queryTotals },
            {
                $group: {
                    _id: null,
                    saldo_total: {
                        $sum: {
                            $cond: [
                                isIngresoCond, // Si es ingreso
                                { $cond: [{ $eq: ["$cuenta", "CajaChica"] }, 0, { $toDouble: "$monto" }] },
                                { $cond: [{ $eq: ["$cuenta", "CajaChica"] }, 0, { $multiply: [{ $toDouble: "$monto" }, -1] }] }
                            ]
                        }
                    },
                    caja_chica: {
                        $sum: {
                            $cond: [
                                isIngresoCond,
                                { $cond: [{ $eq: ["$cuenta", "CajaChica"] }, { $toDouble: "$monto" }, 0] },
                                { $cond: [{ $eq: ["$cuenta", "CajaChica"] }, { $multiply: [{ $toDouble: "$monto" }, -1] }, 0] }
                            ]
                        }
                    }
                }
            }
        ]).toArray();

        console.log("V1 Match Stage used: disabled: false.");
        console.log("V1 Output:", resultadoV1);
        console.log("V2 Output:", resultadoV2);

        // What is the sum if we JUST use V2 but also add { disabled: false }?
        const resultadoV2_disabledFalse = await Movimiento.aggregate([
            { $match: { disabled: false } },
            {
                $group: {
                    _id: null,
                    saldo_total: {
                        $sum: {
                            $cond: [
                                isIngresoCond,
                                { $cond: [{ $eq: ["$cuenta", "CajaChica"] }, 0, { $toDouble: "$monto" }] },
                                { $cond: [{ $eq: ["$cuenta", "CajaChica"] }, 0, { $multiply: [{ $toDouble: "$monto" }, -1] }] }
                            ]
                        }
                    },
                    caja_chica: {
                        $sum: {
                            $cond: [
                                isIngresoCond,
                                { $cond: [{ $eq: ["$cuenta", "CajaChica"] }, { $toDouble: "$monto" }, 0] },
                                { $cond: [{ $eq: ["$cuenta", "CajaChica"] }, { $multiply: [{ $toDouble: "$monto" }, -1] }, 0] }
                            ]
                        }
                    }
                }
            }
        ]).toArray();

        console.log("V2 Output with disabled: false:", resultadoV2_disabledFalse);

    } catch (e) {
        console.error(e)
    }
    process.exit(0);
}
run();
