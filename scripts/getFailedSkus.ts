import "dotenv/config";
import mongoose from "mongoose";
import { Producto } from "../src/models/Producto";

async function getFailedSkus() {
    await mongoose.connect(process.env.MONGO_DEV || "mongodb://127.0.0.1:27017/toyoxpress");

    const failedSkus = [
        "04152-YZZA6",
        "04465-60020",
        "04495-10110",
        "04495-12210"
    ];

    const products = await Producto.find({ "Código": { $in: failedSkus } }).lean();
    console.log(JSON.stringify(products, null, 2));

    process.exit(0);
}
getFailedSkus();
