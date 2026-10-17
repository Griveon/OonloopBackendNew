import mongoose from "mongoose";
import { ProductModel } from "../modules/product/models/product.model.js";
import { ProductRepository } from "../modules/product/repositories/product.repository.js";
import { ProductSearchRepository } from "../modules/product/repositories/globalproductsearch.repository.js";
import { VendorCategoryRepository } from "../modules/vendorcategory/repositories/vendorcategory.repository.js";
import { ProductCategoryRepository } from "../modules/productcategories/repositories/productcategory.repository.js";
import { CartService } from "../modules/cart/services/cart.service.js";
import { OrderRepository } from "../modules/order/repository/order.repository.js";
import "../modules/brand/models/brand.model.js";
import "../modules/unit/models/unit.model.js";
import "../modules/user/models/user.model.js";
import "../modules/paymentmethod/models/paymentmethod.model.js";
import "../modules/paymenttransaction/models/paymenttransaction.model.js";
import "../modules/gstrule/models/gstrule.model.js";

async function runBenchmark() {
    await mongoose.connect("mongodb://127.0.0.1:27017/oonloop");
    console.log("Connected to MongoDB for baseline benchmark.");

    const db = mongoose.connection.db!;

    // 1. Product recent_products
    console.log("\n=== 1. Products: Recent Products Query Plan ===");
    const recentExplain: any = await db.collection("products")
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(50)
        .explain("executionStats");
    console.log("Recent products stage:", recentExplain.executionStats?.executionStages?.stage);
    console.log("Total docs examined:", recentExplain.executionStats?.totalDocsExamined);
    console.log("Execution time (ms):", recentExplain.executionStats?.executionTimeMillis);

    const productRepo = new ProductRepository();
    const t0 = performance.now();
    const sampleProducts = await productRepo.findAll({ isActive: true }, 1, 10);
    const t0Duration = performance.now() - t0;
    console.log(`ProductRepository.findAll(10 docs) latency: ${t0Duration.toFixed(2)}ms, total: ${sampleProducts.total}`);

    // Product by vendor
    const sampleProduct = await ProductModel.findOne({ isActive: true }).lean();
    if (sampleProduct?.vendorId) {
        const tv0 = performance.now();
        const vendorProducts = await productRepo.findByVendor({ vendorId: sampleProduct.vendorId, isActive: true }, 1, 10);
        console.log(`ProductRepository.findByVendor latency: ${(performance.now() - tv0).toFixed(2)}ms, count: ${vendorProducts.total}`);
    }

    // Global product search
    console.log("\n=== 2. Products: Global Search ===");
    const searchRepo = new ProductSearchRepository();
    const ts0 = performance.now();
    const searchResults = await searchRepo.SearchProducts("oil", 1, 20);
    const tsDuration = performance.now() - ts0;
    console.log(`SearchProducts('oil') latency: ${tsDuration.toFixed(2)}ms, found: ${searchResults.total}`);

    // 2. Vendor Category findAll
    console.log("\n=== 3. Vendor Categories: findAll (Customer Browsing) ===");
    const vcRepo = new VendorCategoryRepository();
    const tvc0 = performance.now();
    const vendorCats = await vcRepo.findAll();
    const tvcDuration = performance.now() - tvc0;
    console.log(`VendorCategoryRepository.findAll() latency: ${tvcDuration.toFixed(2)}ms, count: ${vendorCats.length}`);

    // 3. Product Categories: getByVendorCategory
    console.log("\n=== 4. Product Categories: findByVendorCategory ===");
    const pcRepo = new ProductCategoryRepository();
    const sampleVendorCatId = vendorCats[0]?._id?.toString();
    if (sampleVendorCatId) {
        const tpc0 = performance.now();
        const prodCats = await pcRepo.findByVendorCategory(sampleVendorCatId);
        const tpcDuration = performance.now() - tpc0;
        console.log(`findByVendorCategory(${sampleVendorCatId}) latency: ${tpcDuration.toFixed(2)}ms, count: ${prodCats.length}`);
    }

    // 4. Cart getCart
    console.log("\n=== 5. Cart: getCart ===");
    const sampleCart = await db.collection("carts").findOne({ "items.0": { $exists: true } });
    if (sampleCart?.user) {
        const cartService = new CartService();
        const tc0 = performance.now();
        const cart = await cartService.getCart(sampleCart.user.toString());
        const tcDuration = performance.now() - tc0;
        console.log(`CartService.getCart() latency: ${tcDuration.toFixed(2)}ms, items: ${cart.items?.length}`);
    }

    // 5. Orders: findByUser
    console.log("\n=== 6. Orders: findByUser ===");
    const sampleOrder = await db.collection("orders").findOne({ isActive: true });
    if (sampleOrder?.user) {
        const orderRepo = new OrderRepository();
        const to0 = performance.now();
        const userOrders = await orderRepo.findByUser(sampleOrder.user.toString(), 1, 10);
        const toDuration = performance.now() - to0;
        console.log(`OrderRepository.findByUser() latency: ${toDuration.toFixed(2)}ms, total orders: ${userOrders.total}`);

        const orderDetail0 = performance.now();
        const orderDetail = await orderRepo.findById(sampleOrder._id.toString());
        console.log(`OrderRepository.findById() latency: ${(performance.now() - orderDetail0).toFixed(2)}ms, found: ${!!orderDetail}`);
    }

    console.log("\nBaseline benchmark complete.");
    process.exit(0);
}

runBenchmark().catch((err) => {
    console.error("Benchmark error:", err);
    process.exit(1);
});
