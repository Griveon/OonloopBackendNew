import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/oonloop";

interface IndexSpec {
    collection: string;
    fields: Record<string, 1 | -1 | "text">;
    options?: Record<string, any>;
}

const PERFORMANCE_INDEXES: IndexSpec[] = [
    // Product Module
    {
        collection: "products",
        fields: { vendorId: 1, isActive: 1 },
        options: { background: true, name: "idx_perf_vendorId_isActive" },
    },
    {
        collection: "products",
        fields: { isActive: 1, createdAt: -1 },
        options: { background: true, name: "idx_perf_isActive_createdAt" },
    },
    {
        collection: "products",
        fields: { vendorId: 1, createdAt: -1 },
        options: { background: true, name: "idx_perf_vendorId_createdAt" },
    },
    {
        collection: "products",
        fields: { category: 1, isActive: 1, createdAt: -1 },
        options: { background: true, name: "idx_perf_category_isActive_createdAt" },
    },
    {
        collection: "products",
        fields: { productCategory: 1, isActive: 1, createdAt: -1 },
        options: { background: true, name: "idx_perf_productCategory_isActive_createdAt" },
    },

    // Vendor Category Module
    {
        collection: "vendorcategories",
        fields: { isActive: 1, clickCount: -1, _id: 1 },
        options: { background: true, name: "idx_perf_vendorcat_ranking" },
    },

    // Product Category Module
    {
        collection: "productcategories",
        fields: { vendorCategory: 1, isActive: 1 },
        options: { background: true, name: "idx_perf_productcat_vc_active" },
    },

    // Orders Module
    {
        collection: "orders",
        fields: { user: 1, isActive: 1, createdAt: -1 },
        options: { background: true, name: "idx_perf_orders_user_active_created" },
    },
    {
        collection: "orders",
        fields: { vendors: 1, isActive: 1, createdAt: -1 },
        options: { background: true, name: "idx_perf_orders_vendors_active_created" },
    },
];

export async function migratePerformanceIndexes() {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db!;

    console.log(`Starting performance index migration (${PERFORMANCE_INDEXES.length} indexes)...`);

    let createdCount = 0;
    let existingCount = 0;

    for (const spec of PERFORMANCE_INDEXES) {
        const coll = db.collection(spec.collection);
        const existingIndexes = await coll.indexes();

        const indexName = spec.options?.name;
        const alreadyExists = existingIndexes.some(
            (idx) => idx.name === indexName || JSON.stringify(idx.key) === JSON.stringify(spec.fields)
        );

        if (alreadyExists) {
            console.log(`  ✓ [${spec.collection}] index ${indexName || JSON.stringify(spec.fields)} already exists`);
            existingCount++;
        } else {
            console.log(`  + [${spec.collection}] creating index ${indexName || JSON.stringify(spec.fields)}...`);
            await coll.createIndex(spec.fields as any, spec.options || {});
            createdCount++;
        }
    }

    console.log("\n================================================");
    console.log(`Index Migration Summary: ${createdCount} created, ${existingCount} already present.`);
    console.log("================================================");
}

if (process.argv[1]?.includes("migrate-performance-indexes")) {
    migratePerformanceIndexes()
        .then(() => {
            console.log("Performance index migration finished successfully.");
            process.exit(0);
        })
        .catch((err) => {
            console.error("Migration failed:", err);
            process.exit(1);
        });
}
