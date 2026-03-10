import "dotenv/config";
import mongoose from "mongoose";
import { SyncJob } from "../src/models/SyncJob";

async function checkJobs() {
    await mongoose.connect(process.env.MONGO_DEV || "mongodb://127.0.0.1:27017/toyoxpress");

    const jobs = await SyncJob.find().sort({ createdAt: -1 }).limit(5);
    console.log("Últimos 5 SyncJobs:");
    jobs.forEach(j => {
        console.log(`- ID: ${j._id} | Date: ${j.createdAt} | Status: ${j.status} | Total SKUs: ${j.totalSKUs} | Creados: ${j.metrics?.created} / Actualizados: ${j.metrics?.updated} / Fallidos: ${j.metrics?.failed}`);
    });
    process.exit(0);
}
checkJobs();
