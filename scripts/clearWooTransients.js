require('dotenv').config();
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const WooCommerce = new WooCommerceRestApi({
    url: process.env.WC_URL || "https://toyoxpress.com/",
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET,
    version: "wc/v3",
    queryStringAuth: true,
});

async function run() {
    try {
        console.log("Obteniendo herramientas del sistema Woo...");
        const toolsRes = await WooCommerce.get("system_status/tools");
        console.log(toolsRes.data.map(t => t.id).join(', '));

        console.log("Ejecutando clear_transients...");
        const res = await WooCommerce.put("system_status/tools/clear_transients");
        console.log("Resultado:", res.data);
    } catch (e) {
        console.error("Error", e.response?.data || e);
    }
}
run();
