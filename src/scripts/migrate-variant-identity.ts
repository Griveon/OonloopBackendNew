import mongoose, { Types } from "mongoose";
import { connectDatabase } from "../config/database.js";
import { ProductModel } from "../modules/product/models/product.model.js";
import { CartModel } from "../modules/cart/models/cart.model.js";
import { OrderModel } from "../modules/order/models/order.model.js";
import { PreorderOrderModel } from "../modules/preorder/models/preorderorder.model.js";

interface VariantOccurrence {
    productId: Types.ObjectId;
    productKey: string;
    variantIndex: number;
    isMainCatalogProduct: boolean;
}

interface ReferenceMapping {
    productId: Types.ObjectId;
    oldVariantId: Types.ObjectId;
    newVariantId: Types.ObjectId;
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const verbose = args.includes("--verbose");
const rollbackArg = args.find((arg) => arg.startsWith("--rollback="));
const rollbackRunId = rollbackArg?.split("=")[1];
const runId = `variant-identity-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const backupCollectionName = "variant_identity_migration_backups";

const backupDocuments = async (
    collectionName: string,
    documents: any[],
    session: mongoose.ClientSession
) => {
    if (documents.length === 0) return;
    const backupCollection = mongoose.connection.collection(backupCollectionName);
    await backupCollection.insertMany(
        documents.map((document) => ({
            runId,
            collection: collectionName,
            documentId: document._id,
            document,
            createdAt: new Date(),
        })),
        { ordered: true, session }
    );
};

const rollback = async (targetRunId: string) => {
    if (!apply) {
        throw new Error("Rollback is destructive and requires both --rollback=<runId> and --apply");
    }

    const backups = await mongoose.connection
        .collection(backupCollectionName)
        .find({ runId: targetRunId })
        .toArray();
    if (backups.length === 0) throw new Error(`No backup found for run ${targetRunId}`);

    const byCollection = new Map<string, any[]>();
    for (const backup of backups) {
        const documents = byCollection.get(backup.collection) || [];
        documents.push(backup.document);
        byCollection.set(backup.collection, documents);
    }

    for (const [collectionName, documents] of byCollection) {
        const collection = mongoose.connection.collection(collectionName);
        await collection.bulkWrite(
            documents.map((document) => ({
                replaceOne: {
                    filter: { _id: document._id },
                    replacement: document,
                    upsert: true,
                },
            })),
            { ordered: true }
        );
    }

    console.log(`Rollback completed from backup run ${targetRunId}.`);
};

const run = async () => {
    await connectDatabase();

    if (rollbackRunId) {
        await rollback(rollbackRunId);
        return;
    }

    const products: any[] = await ProductModel.find({ "variants.0": { $exists: true } })
        .sort({ _id: 1 })
        .lean();
    const occurrencesByVariant = new Map<string, VariantOccurrence[]>();

    for (const product of products) {
        (product.variants || []).forEach((variant: any, variantIndex: number) => {
            const key = variant._id.toString();
            const occurrences = occurrencesByVariant.get(key) || [];
            occurrences.push({
                productId: product._id,
                productKey: product._id.toString(),
                variantIndex,
                isMainCatalogProduct: product.isMainCatalogProduct === true,
            });
            occurrencesByVariant.set(key, occurrences);
        });
    }

    const changedProducts = new Map<string, any>();
    const originalProducts = new Map<string, any>();
    const referenceMappings = new Map<string, ReferenceMapping>();
    const duplicateGroups: any[] = [];
    let duplicateIdentityCount = 0;
    let rekeyedVariantCount = 0;

    for (const [variantKey, occurrences] of occurrencesByVariant) {
        if (occurrences.length < 2) continue;
        duplicateIdentityCount++;

        occurrences.sort((left, right) => {
            if (left.isMainCatalogProduct !== right.isMainCatalogProduct) {
                return left.isMainCatalogProduct ? -1 : 1;
            }
            const productCompare = left.productKey.localeCompare(right.productKey);
            return productCompare || left.variantIndex - right.variantIndex;
        });
        duplicateGroups.push({
            variantId: variantKey,
            occurrences: occurrences.map((occurrence, index) => ({
                productId: occurrence.productKey,
                variantIndex: occurrence.variantIndex,
                isMainCatalogProduct: occurrence.isMainCatalogProduct,
                action: index === 0 ? "keep" : "rekey-and-link-sourceVariantId",
            })),
        });

        const canonicalOccurrence = occurrences[0]!;
        for (const occurrence of occurrences.slice(1)) {
            const product = changedProducts.get(occurrence.productKey) ||
                products.find((candidate) => candidate._id.toString() === occurrence.productKey);
            if (!product) throw new Error(`Product ${occurrence.productKey} disappeared while planning`);

            // Clone the array before its first mutation so the dry-run plan is isolated.
            if (!changedProducts.has(occurrence.productKey)) {
                originalProducts.set(occurrence.productKey, {
                    ...product,
                    variants: product.variants.map((variant: any) => ({ ...variant })),
                });
                product.variants = product.variants.map((variant: any) => ({ ...variant }));
                changedProducts.set(occurrence.productKey, product);
            }

            const variant = product.variants[occurrence.variantIndex];
            const newVariantId = new Types.ObjectId();
            variant._id = newVariantId;
            variant.sourceVariantId = variant.sourceVariantId || new Types.ObjectId(variantKey);
            rekeyedVariantCount++;

            // A cart/order can only identify one of multiple same-id variants inside
            // one product. Keep its reference on the first surviving/re-keyed variant.
            const mappingKey = `${occurrence.productKey}:${variantKey}`;
            if (
                occurrence.productKey !== canonicalOccurrence.productKey &&
                !referenceMappings.has(mappingKey)
            ) {
                referenceMappings.set(mappingKey, {
                    productId: occurrence.productId,
                    oldVariantId: new Types.ObjectId(variantKey),
                    newVariantId,
                });
            }
        }
    }

    const mappings = [...referenceMappings.values()];
    const pairFilters = mappings.map((mapping) => ({
        product: mapping.productId,
        variant: mapping.oldVariantId,
    }));
    const cartFilter: any = pairFilters.length ? { items: { $elemMatch: { $or: pairFilters } } } : { _id: null };
    const activeOrderFilter: any = pairFilters.length
        ? {
            status: { $nin: ["delivered", "cancelled", "returned"] },
            items: { $elemMatch: { $or: pairFilters } },
        }
        : { _id: null };
    const preorderPairs = mappings.map((mapping) => ({
        product: mapping.productId,
        variantId: mapping.oldVariantId,
    }));
    const activePreorderFilter: any = preorderPairs.length
        ? {
            status: { $nin: ["delivered", "cancelled"] },
            items: { $elemMatch: { $or: preorderPairs } },
        }
        : { _id: null };

    const [affectedCarts, affectedOrders, affectedPreorders] = await Promise.all([
        CartModel.find(cartFilter).lean(),
        OrderModel.find(activeOrderFilter).lean(),
        PreorderOrderModel.find(activePreorderFilter).lean(),
    ]);

    console.log(JSON.stringify({
        mode: apply ? "apply" : "dry-run",
        runId: apply ? runId : undefined,
        duplicateVariantIds: duplicateIdentityCount,
        variantsToRekey: rekeyedVariantCount,
        productsToUpdate: changedProducts.size,
        cartsToUpdate: affectedCarts.length,
        activeOrdersToUpdate: affectedOrders.length,
        activePreordersToUpdate: affectedPreorders.length,
        historicalOrdersChanged: 0,
        duplicateGroups: verbose ? duplicateGroups : duplicateGroups.slice(0, 50),
        duplicateGroupsTruncated: !verbose && duplicateGroups.length > 50,
    }, null, 2));

    if (!apply || changedProducts.size === 0) {
        console.log(apply ? "No duplicate variant identities found." : "Dry run complete; no data was changed.");
        return;
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await backupDocuments(ProductModel.collection.name, [...originalProducts.values()], session);
            await backupDocuments(CartModel.collection.name, affectedCarts, session);
            await backupDocuments(OrderModel.collection.name, affectedOrders, session);
            await backupDocuments(PreorderOrderModel.collection.name, affectedPreorders, session);

            await ProductModel.bulkWrite(
                [...changedProducts.values()].map((product) => ({
                    updateOne: {
                        filter: { _id: product._id },
                        update: { $set: { variants: product.variants } },
                    },
                })),
                { ordered: true, session }
            );

            for (const mapping of mappings) {
                await Promise.all([
                    CartModel.updateMany(
                        { items: { $elemMatch: { product: mapping.productId, variant: mapping.oldVariantId } } },
                        { $set: { "items.$[item].variant": mapping.newVariantId } },
                        { session, arrayFilters: [{ "item.product": mapping.productId, "item.variant": mapping.oldVariantId }] }
                    ),
                    OrderModel.updateMany(
                        {
                            status: { $nin: ["delivered", "cancelled", "returned"] },
                            items: { $elemMatch: { product: mapping.productId, variant: mapping.oldVariantId } },
                        },
                        { $set: { "items.$[item].variant": mapping.newVariantId } },
                        { session, arrayFilters: [{ "item.product": mapping.productId, "item.variant": mapping.oldVariantId }] }
                    ),
                    PreorderOrderModel.updateMany(
                        {
                            status: { $nin: ["delivered", "cancelled"] },
                            items: { $elemMatch: { product: mapping.productId, variantId: mapping.oldVariantId } },
                        },
                        { $set: { "items.$[item].variantId": mapping.newVariantId } },
                        { session, arrayFilters: [{ "item.product": mapping.productId, "item.variantId": mapping.oldVariantId }] }
                    ),
                ]);
            }
        });
    } finally {
        await session.endSession();
    }

    console.log(`Migration complete. Backup run id: ${runId}`);
    console.log(`Rollback command: npm run migrate:variant-identity -- --rollback=${runId} --apply`);
};

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
