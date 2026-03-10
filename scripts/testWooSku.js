require('dotenv').config();
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const WooCommerce = new WooCommerceRestApi({
    url: process.env.WC_URL || "https://toyoxpress.com/",
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET,
    version: "wc/v3",
    queryStringAuth: true,
});

async function checkSku() {
    try {
        console.log("Buscando en TRASH...");
        const resTrash = await WooCommerce.get("products", { sku: "04152-YZZA6", status: "trash" });
        console.log("TRASH INFO:", JSON.stringify(resTrash.data, null, 2));

        console.log("Buscando en PUBLISH...");
        const resPub = await WooCommerce.get("products", { sku: "04152-YZZA6", status: "publish" });
        console.log("PUBLISH INFO:", JSON.stringify(resPub.data, null, 2));

    } catch (e) {
        console.error("GET error", e);
    }
}
checkSku();
