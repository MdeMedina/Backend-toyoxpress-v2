require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGO_DEV || 'mongodb+srv://MdeMedina:5D1Pe7rl8POn7yQv@cluster0.mmcvicb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(async () => {
        const job = await mongoose.connection.collection('syncjobs').find().sort({ createdAt: -1 }).limit(1).toArray();
        if (job.length > 0) {
            console.log("Found Job ID:", job[0]._id);
            const details = job[0].details || [];
            const errors = details.filter(d => d.skus && d.skus.length > 0 && d.status !== 'success');
            let errorCount = 0;
            for (let e of errors) {
                console.log(`Chunk ${e.chunkIndex}:`);
                console.log(e.skus.slice(0, 5)); // print first 5 errors per chunk
                errorCount++;
                if (errorCount > 3) break;
            }
        }
        process.exit(0);
    });
