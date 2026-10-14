import mongoose, { type Types } from "mongoose";
import { OrderModel } from "../models/order.model.js";
import { ProductModel } from "../../product/models/product.model.js";

/**
 * Idempotently records product sales quantities for an eligible order.
 * Only increments soldCount if salesCounted has NOT been set to true yet.
 * Returns true if sales were applied, false if already counted or ineligible.
 */
export async function recordOrderSales(
    orderId: string | Types.ObjectId
): Promise<boolean> {
    if (!orderId) return false;

    // Atomically claim the order for sales counting.
    // Eligible states:
    // 1. paymentStatus === "success" (online or paid)
    // 2. paymentMode === "cod" AND status is a valid placed/processing/shipped/delivered state
    // Excludes cancelled, returned, or failed orders.
    const filter: any = {
        _id: orderId,
        isActive: true,
        salesCounted: { $ne: true },
        status: { $nin: ["cancelled", "returned", "failed"] },
        $or: [
            { paymentStatus: "success" },
            {
                paymentMode: "cod",
                status: { $nin: ["pending", "cancelled", "returned", "failed"] },
            },
        ],
    };

    const order: any = await OrderModel.findOneAndUpdate(
        filter,
        {
            $set: { salesCounted: true },
        },
        { new: false }
    );

    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
        return false;
    }

    // Aggregate quantities by product ID to perform one $inc per product
    const productQuantities = new Map<string, number>();
    for (const item of order.items) {
        const productId = item.product?.toString();
        const quantity = Number(item.quantity || 0);
        if (productId && quantity > 0) {
            productQuantities.set(
                productId,
                (productQuantities.get(productId) || 0) + quantity
            );
        }
    }

    if (productQuantities.size === 0) {
        return true;
    }

    const updateOperations = Array.from(productQuantities.entries()).map(
        ([productId, quantity]) =>
            ProductModel.updateOne(
                { _id: productId },
                { $inc: { soldCount: quantity } }
            )
    );

    await Promise.all(updateOperations);
    return true;
}

/**
 * Reverts product sales counts when an eligible order is cancelled or returned.
 * Safe to call multiple times (idempotent).
 */
export async function revertOrderSales(
    orderId: string | Types.ObjectId
): Promise<boolean> {
    if (!orderId) return false;

    const filter: any = {
        _id: orderId,
        salesCounted: true,
    };

    const order: any = await OrderModel.findOneAndUpdate(
        filter,
        {
            $set: { salesCounted: false },
        },
        { new: false }
    );

    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
        return false;
    }

    const productQuantities = new Map<string, number>();
    for (const item of order.items) {
        const productId = item.product?.toString();
        const quantity = Number(item.quantity || 0);
        if (productId && quantity > 0) {
            productQuantities.set(
                productId,
                (productQuantities.get(productId) || 0) + quantity
            );
        }
    }

    if (productQuantities.size === 0) {
        return true;
    }

    // Decrement soldCount safely, bounded to 0
    const updateOperations = Array.from(productQuantities.entries()).map(
        ([productId, quantity]) =>
            ProductModel.updateOne(
                { _id: productId },
                [
                    {
                        $set: {
                            soldCount: {
                                $max: [
                                    0,
                                    {
                                        $subtract: [
                                            { $ifNull: ["$soldCount", 0] },
                                            quantity,
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                ]
            )
    );

    await Promise.all(updateOperations);
    return true;
}

export interface BackfillSummary {
    dryRun: boolean;
    totalEligibleOrders: number;
    processedOrders: number;
    affectedProducts: number;
    totalQuantityCounted: number;
    productTotals: Record<string, number>;
}

/**
 * Dry-run or live backfill of historical sales for orders where salesCounted is not true.
 * Marks processed orders with salesCounted = true to prevent future double counting.
 */
export async function backfillHistoricalSales(
    options: { dryRun?: boolean } = {}
): Promise<BackfillSummary> {
    const dryRun = options.dryRun !== false;

    const query: any = {
        isActive: true,
        salesCounted: { $ne: true },
        status: { $nin: ["cancelled", "returned", "failed"] },
        $or: [
            { paymentStatus: "success" },
            {
                paymentMode: "cod",
                status: { $nin: ["pending", "cancelled", "returned", "failed"] },
            },
        ],
    };

    const eligibleOrders = await OrderModel.find(query)
        .select("_id items orderNumber paymentStatus paymentMode status")
        .lean();

    const productTotals = new Map<string, number>();
    const orderIdsToMark: mongoose.Types.ObjectId[] = [];
    let totalQuantityCounted = 0;

    for (const order of eligibleOrders) {
        orderIdsToMark.push(order._id);
        if (Array.isArray(order.items)) {
            for (const item of order.items) {
                const productId = item.product?.toString();
                const qty = Number(item.quantity || 0);
                if (productId && qty > 0) {
                    productTotals.set(
                        productId,
                        (productTotals.get(productId) || 0) + qty
                    );
                    totalQuantityCounted += qty;
                }
            }
        }
    }

    if (!dryRun && orderIdsToMark.length > 0) {
        // Apply increments to products
        const productUpdates = Array.from(productTotals.entries()).map(
            ([productId, quantity]) =>
                ProductModel.updateOne(
                    { _id: productId },
                    { $inc: { soldCount: quantity } }
                )
        );
        await Promise.all(productUpdates);

        // Mark orders as salesCounted = true
        await OrderModel.updateMany(
            { _id: { $in: orderIdsToMark } },
            { $set: { salesCounted: true } }
        );
    }

    const productTotalsObj: Record<string, number> = {};
    for (const [id, count] of productTotals) {
        productTotalsObj[id] = count;
    }

    return {
        dryRun,
        totalEligibleOrders: eligibleOrders.length,
        processedOrders: orderIdsToMark.length,
        affectedProducts: productTotals.size,
        totalQuantityCounted,
        productTotals: productTotalsObj,
    };
}
