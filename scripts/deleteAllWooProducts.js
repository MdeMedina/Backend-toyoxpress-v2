require('dotenv').config();
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const WooCommerce = new WooCommerceRestApi({
    url: process.env.WC_URL || "https://toyoxpress.com/",
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET,
    version: "wc/v3",
    queryStringAuth: true,
});

async function deleteAllProducts() {
    console.log("⚠️ INICIANDO SECUENCIA DE BORRADO MASIVO EN WOOCOMMERCE...");
    console.log("Conectando a: ", process.env.WC_URL || "https://toyoxpress.com/");

    try {
        let hasMore = true;
        let totalDeleted = 0;

        while (hasMore) {
            console.log(`\nBuscando productos...`);
            // Traemos solo el ID para ahorrar memoria y ancho de banda
            const response = await WooCommerce.get("products", {
                per_page: 100, // Máximo permitido por defecto en la API de Woo
                page: 1,       // Siempre leemos la página 1 porque estamos eliminando los que están de primeros
                _fields: "id"
            });

            const products = response.data;

            if (!products || products.length === 0) {
                console.log("No hay más productos por eliminar en la tienda.");
                hasMore = false;
                break;
            }

            const idsToDelete = products.map(p => p.id);
            console.log(`🗑️ Eliminando lote de ${idsToDelete.length} productos...`);

            // Batch delete
            const batchResponse = await WooCommerce.post("products/batch", {
                delete: idsToDelete // Force=delete permanentemente, pero si no se pasa force=true van a la papelera. En este caso los mandaremos a la papelera, a menos que quieras eliminarlos permanentemente (en ese caso habría que pasarle "force: true" a la petición original, o iterar con un DELETE forzado).
            });

            // Para asegurar eliminación permanente, el endpoint products/batch no acepta force=true directo en la raiz según la documentación estándar, pero podemos enviar peticiones individuales si queremos (muy lento). O podemos tratar de vaciar la papelera.
            // Según la documentación de WooCommerce, el parámetro delete de la función batch los manda a la papelera.
            // Para eliminarlos permanentemente en un Batch, el endpoint lo hace si pasamos IDs al array "delete".

            let exitoConteo = 0;
            if (batchResponse.data && batchResponse.data.delete) {
                batchResponse.data.delete.forEach(r => {
                    if (!r.error) exitoConteo++;
                })
            }

            totalDeleted += exitoConteo;
            console.log(`✅ ${exitoConteo} productos eliminados en esta ronda. (Acumulado: ${totalDeleted})`);
        }

        console.log(`\n🎉 PROCESO COMPLETADO. Se eliminaron en total ${totalDeleted} productos.`);
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Error fatal:");
        if (error.response && error.response.data) {
            console.error(error.response.data);
        } else {
            console.error(error.message || error);
        }
        process.exit(1);
    }
}

deleteAllProducts();
