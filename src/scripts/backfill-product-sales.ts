import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { backfillHistoricalSales } from "../modules/order/services/ordersales.service.js";

const parseArgs = () => {
    const args = process.argv.slice(2);
    const apply = args.includes("--apply");
    const dryRun = !apply || args.includes("--dry-run");
    return { dryRun };
};

const runBackfill = async (): Promise<void> => {
    const { dryRun } = parseArgs();

    console.log("============================================================");
    console.log("OONLOOP HISTORICAL PRODUCT SALES BACKFILL");
    console.log("============================================================");
    console.log(
        `Mode: ${
            dryRun
                ? "DRY-RUN (Simulating backfill - no database changes)"
                : "LIVE APPLY (Updating product soldCount and marking orders)"
        }`
    );
    console.log("------------------------------------------------------------");

    try {
        await connectDatabase();

        const summary = await backfillHistoricalSales({ dryRun });

        console.log(`Total eligible historical orders: ${summary.totalEligibleOrders}`);
        console.log(`Orders processed:                 ${summary.processedOrders}`);
        console.log(`Distinct products affected:       ${summary.affectedProducts}`);
        console.log(`Total product units counted:      ${summary.totalQuantityCounted}`);
        console.log("------------------------------------------------------------");

        if (summary.affectedProducts > 0) {
            console.log("Sample product quantities calculated:");
            const entries = Object.entries(summary.productTotals).slice(0, 15);
            for (const [productId, qty] of entries) {
                console.log(`  - Product ${productId}: +${qty} units`);
            }
            if (summary.affectedProducts > 15) {
                console.log(`  ... and ${summary.affectedProducts - 15} more products.`);
            }
        }

        console.log("============================================================");
        if (dryRun) {
            console.log("Dry-run complete. To apply changes to the database, run:");
            console.log("  npm run migrate:product-sales -- --apply");
            console.log("or:");
            console.log("  tsx src/scripts/backfill-product-sales.ts --apply");
        } else {
            console.log("Live backfill applied successfully!");
        }
        console.log("============================================================");
    } catch (error: any) {
        console.error("Backfill failed:", error?.message || error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void runBackfill();
