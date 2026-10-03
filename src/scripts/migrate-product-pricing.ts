import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { ProductModel } from "../modules/product/models/product.model.js";
import { calculateProductHandling } from "../modules/product/utils/pricing.util.js";
import { VendorCategoryModel } from "../modules/vendorcategory/models/vendorcategory.model.js";

interface MigrationOptions {
    dryRun: boolean;
    recalculateAll: boolean;
    batchSize: number;
}

const parseArgs = (): MigrationOptions => {
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const recalculateAll = args.includes("--all") || args.includes("--force");
    const batchSizeArg = args.find((a) => a.startsWith("--batch-size="));
    const batchSize = batchSizeArg ? Math.max(parseInt(batchSizeArg.split("=")[1] || "500", 10), 1) : 500;

    return { dryRun, recalculateAll, batchSize };
};

const runProductPricingMigration = async (): Promise<void> => {
    const { dryRun, recalculateAll, batchSize } = parseArgs();

    console.log("============================================================");
    console.log("📦 PRODUCT PRICING MIGRATION (customerSellingPrice & productHandling)");
    console.log("============================================================");
    console.log("⚠️  Run this against staging/database backup first.");
    console.log("⚠️  Use --dry-run before real migration.");
    console.log("------------------------------------------------------------");
    console.log(`Mode:            ${dryRun ? "🔍 DRY-RUN (no database changes)" : "🚀 LIVE MIGRATION"}`);
    console.log(`Scope:           ${recalculateAll ? "ALL products (--all)" : "Products missing/invalid customerSellingPrice or productHandling"}`);
    console.log(`Batch Size:      ${batchSize}`);
    console.log("------------------------------------------------------------\n");

    await connectDatabase();

    const baseFilter: any = recalculateAll
        ? {}
        : {
            $or: [
                { customerSellingPrice: { $exists: false } },
                { customerSellingPrice: null },
                { customerSellingPrice: { $lte: 0 } },
                { productHandlingCharges: { $exists: false } },
                { productHandlingCharges: null },
                { productHandling: { $exists: false } },
                { productHandling: null },
                { additionalHandling: { $exists: false } },
                { "additionalHandling.amount": { $exists: false } },
                { "variants.customerSellingPrice": { $exists: false } },
                { "variants.customerSellingPrice": null },
                { "variants.customerSellingPrice": { $lte: 0 } },
                { "variants.productHandlingCharges": { $exists: false } },
                { "variants.productHandlingCharges": null },
                { "variants.productHandling": { $exists: false } },
                { "variants.productHandling": null },
                { "variants.additionalHandling": { $exists: false } },
                { "variants.additionalHandling.amount": { $exists: false } },
            ],
        };

    const totalMatching = await ProductModel.countDocuments(baseFilter);
    console.log(`Total matching products found: ${totalMatching}\n`);

    if (totalMatching === 0) {
        console.log("✅ No products require pricing migration.");
        await mongoose.disconnect();
        return;
    }

    let scannedCount = 0;
    let validCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const samples: string[] = [];

    let lastId: any = null;
    let operations: any[] = [];

    while (true) {
        const query: any = { ...baseFilter };
        if (lastId) {
            query._id = { $gt: lastId };
        }

        const batch = await ProductModel.find(query)
            .sort({ _id: 1 })
            .limit(batchSize)
            .select("_id name price mrp customerSellingPrice productHandlingCharges productHandling variants category")
            .lean();

        if (batch.length === 0) {
            break;
        }

        const categoryIds = [
            ...new Set(
                batch
                    .map((product: any) => product.category?.toString())
                    .filter(Boolean)
            ),
        ];

        const categories = await VendorCategoryModel.find({
            _id: { $in: categoryIds },
        })
            .select("_id additionalHandling")
            .lean();

        const categoryHandlingMap = new Map(
            categories.map((category: any) => [
                category._id.toString(),
                category.additionalHandling,
            ])
        );

        for (const product of batch) {
            scannedCount++;
            lastId = product._id;

            const additionalHandling =
                categoryHandlingMap.get((product as any).category?.toString?.() || "") ?? null;

            const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
            let variantsUpdated = 0;
            const updatedVariants: any[] = [];
            let variantError = "";

            if (hasVariants) {
                for (const v of product.variants as any[]) {
                    const vPrice = Number(v.price);
                    const vMrp = Number(v.mrp !== undefined && v.mrp !== null ? v.mrp : product.mrp);

                    if (isNaN(vPrice) || vPrice <= 0) {
                        variantError = `variant has invalid price (${v.price})`;
                        updatedVariants.push(v);
                        continue;
                    }
                    if (isNaN(vMrp) || vMrp <= 0) {
                        variantError = `variant has invalid MRP (${vMrp})`;
                        updatedVariants.push(v);
                        continue;
                    }
                    if (vPrice > vMrp) {
                        variantError = `variant price (${vPrice}) exceeds MRP (${vMrp})`;
                        updatedVariants.push(v);
                        continue;
                    }

                    try {
                        const calc = calculateProductHandling(vPrice, vMrp, additionalHandling);
                        updatedVariants.push({
                            ...v,
                            price: vPrice,
                            mrp: vMrp,
                            productHandling: calc.productHandling,
                            productHandlingCharges: calc.productHandlingCharges,
                            customerSellingPrice: calc.customerSellingPrice,
                            additionalHandling: calc.additionalHandling,
                        });
                        variantsUpdated++;
                    } catch (err: any) {
                        variantError = err.message;
                        updatedVariants.push(v);
                    }
                }
            }

            // Root product pricing
            const rootPrice = Number(product.price);
            const rootMrp = Number(product.mrp);
            let rootCalculated: any = null;

            if (!isNaN(rootPrice) && rootPrice > 0 && !isNaN(rootMrp) && rootMrp > 0 && rootPrice <= rootMrp) {
                try {
                    rootCalculated = calculateProductHandling(rootPrice, rootMrp, additionalHandling);
                } catch {
                    // Handled below
                }
            } else if (hasVariants && variantsUpdated > 0) {
                // Fallback root pricing to first successfully calculated variant
                const firstValidVariant = updatedVariants.find((v: any) => v.customerSellingPrice !== undefined);
                if (firstValidVariant) {
                    rootCalculated = {
                        productHandling: firstValidVariant.productHandling,
                        productHandlingCharges: firstValidVariant.productHandlingCharges,
                        customerSellingPrice: firstValidVariant.customerSellingPrice,
                        additionalHandling: firstValidVariant.additionalHandling,
                    };
                }
            }

            if (!rootCalculated && variantsUpdated === 0) {
                skippedCount++;
                const reason = variantError || (
                    isNaN(rootPrice) || rootPrice <= 0
                        ? `missing/invalid price (${product.price})`
                        : isNaN(rootMrp) || rootMrp <= 0
                            ? `missing/invalid MRP (${product.mrp})`
                            : rootPrice > rootMrp
                                ? `price (${rootPrice}) > MRP (${rootMrp})`
                                : "unresolvable pricing"
                );
                console.log(`⚠️  [SKIPPED] ${product._id} ("${product.name}"): ${reason}`);
                continue;
            }

            validCount++;

            const updateSet: any = {};
            if (hasVariants && variantsUpdated > 0) {
                updateSet.variants = updatedVariants;
            }
            if (rootCalculated) {
                updateSet.productHandling = rootCalculated.productHandling;
                updateSet.productHandlingCharges = rootCalculated.productHandlingCharges;
                updateSet.customerSellingPrice = rootCalculated.customerSellingPrice;
                updateSet.additionalHandling = rootCalculated.additionalHandling;
            }

            if (samples.length < 5) {
                const sampleBasePrice = !isNaN(rootPrice) && rootPrice > 0 ? rootPrice : updatedVariants[0]?.price;
                const sampleMrp = !isNaN(rootMrp) && rootMrp > 0 ? rootMrp : updatedVariants[0]?.mrp;
                const sampleHandling = rootCalculated?.productHandling ?? updatedVariants[0]?.productHandling;
                const sampleCustPrice = rootCalculated?.customerSellingPrice ?? updatedVariants[0]?.customerSellingPrice;

                samples.push(
                    `• ID: ${product._id} ("${product.name}") | basePrice=₹${sampleBasePrice} | mrp=₹${sampleMrp} -> productHandling=₹${sampleHandling} | customerSellingPrice=₹${sampleCustPrice}${hasVariants ? ` (${variantsUpdated} variant(s) updated)` : ""}`
                );
            }

            if (!dryRun) {
                operations.push({
                    updateOne: {
                        filter: { _id: product._id },
                        update: { $set: updateSet },
                    },
                });

                if (operations.length >= batchSize) {
                    try {
                        await ProductModel.bulkWrite(operations, { ordered: false });
                    } catch (err: any) {
                        console.error("Batch update error:", err.message);
                        failedCount += operations.length;
                    }
                    operations = [];
                    process.stdout.write(`\rProgress: ${scannedCount}/${totalMatching} processed...`);
                }
            }
        }
    }

    // Flush remaining operations
    if (!dryRun && operations.length > 0) {
        try {
            await ProductModel.bulkWrite(operations, { ordered: false });
        } catch (err: any) {
            console.error("Final batch update error:", err.message);
            failedCount += operations.length;
        }
        operations = [];
    }

    console.log("\n\n------------------------------------------------------------");
    if (samples.length > 0) {
        console.log("📋 Sample Calculations:");
        samples.forEach((s) => console.log(s));
        console.log("------------------------------------------------------------");
    }

    if (dryRun) {
        console.log("🔒 DRY-RUN COMPLETE: Zero database changes were made.");
    } else {
        console.log("✅ MIGRATION COMPLETED.");
    }

    console.log("------------------------------------------------------------");
    console.log(`Total Scanned:  ${scannedCount}`);
    console.log(`Total Valid:    ${validCount}`);
    console.log(`Total Skipped:  ${skippedCount}`);
    console.log(`Total Failed:   ${failedCount}`);
    console.log("============================================================\n");
};

runProductPricingMigration()
    .catch((error) => {
        console.error("Migration encountered a fatal error:", error);
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
