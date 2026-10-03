import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { VendorCategoryModel } from "../modules/vendorcategory/models/vendorcategory.model.js";

const SPECIAL_CATEGORY_NAMES = [
    "Meat & Fish",
    "Fruits & Vegetables",
    "Dairy & Bakery",
    "Restaurants & Cloud Kitchen",
];

const ADDITIONAL_HANDLING = {
    enabled: true,
    percentage: 0.75,
    maxAmount: 10,
};

const parseArgs = () => ({
    dryRun: process.argv.slice(2).includes("--dry-run"),
});

const runVendorCategoryAdditionalHandlingMigration = async (): Promise<void> => {
    const { dryRun } = parseArgs();

    console.log("============================================================");
    console.log("VENDOR CATEGORY ADDITIONAL HANDLING MIGRATION");
    console.log("============================================================");
    console.log(`Mode: ${dryRun ? "DRY-RUN (no database changes)" : "LIVE MIGRATION"}`);
    console.log("------------------------------------------------------------");

    await connectDatabase();

    const categories = await VendorCategoryModel.find({
        name: { $in: SPECIAL_CATEGORY_NAMES },
    })
        .select("_id name additionalHandling")
        .lean();

    const foundNames = new Set(categories.map((category) => category.name));
    const missingNames = SPECIAL_CATEGORY_NAMES.filter((name) => !foundNames.has(name));

    console.log(`Categories found: ${categories.length}/${SPECIAL_CATEGORY_NAMES.length}`);
    if (missingNames.length > 0) {
        console.log(`Missing categories: ${missingNames.join(", ")}`);
    }

    for (const category of categories) {
        console.log(
            `${dryRun ? "[DRY-RUN]" : "[UPDATE]"} ${category.name}: additionalHandling=${JSON.stringify(ADDITIONAL_HANDLING)}`
        );
    }

    if (!dryRun && categories.length > 0) {
        await VendorCategoryModel.updateMany(
            {
                name: { $in: SPECIAL_CATEGORY_NAMES },
            },
            {
                $set: {
                    additionalHandling: ADDITIONAL_HANDLING,
                },
            }
        );
    }

    console.log("------------------------------------------------------------");
    console.log(dryRun ? "DRY-RUN COMPLETE." : "MIGRATION COMPLETED.");
    console.log("============================================================");
};

runVendorCategoryAdditionalHandlingMigration()
    .catch((error) => {
        console.error("Migration encountered a fatal error:", error);
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
