import assert from "node:assert/strict";
import test from "node:test";
import mongoose, { Types } from "mongoose";
import { ProductModel } from "../modules/product/models/product.model.js";
import { ProductRepository } from "../modules/product/repositories/product.repository.js";
import { ProductService } from "../modules/product/services/product.service.js";
import { createProductViewGuard } from "../modules/product/middlewares/productview.middleware.js";
import { OrderModel } from "../modules/order/models/order.model.js";
import {
    recordOrderSales,
    revertOrderSales,
    backfillHistoricalSales,
} from "../modules/order/services/ordersales.service.js";

test("new products default viewCount and soldCount to zero", () => {
    const product = new ProductModel({
        vendorId: new Types.ObjectId(),
        productCategory: new Types.ObjectId(),
        category: new Types.ObjectId(),
        name: "Fresh Tomatoes",
        slug: "fresh-tomatoes",
    });

    assert.equal(product.viewCount, 0);
    assert.equal(product.soldCount, 0);
});

test("atomic increment of viewCount on active product", async () => {
    const productId = new Types.ObjectId();
    const originalUpdate = (ProductModel as any).findOneAndUpdate;
    let capturedArgs: any[] = [];

    (ProductModel as any).findOneAndUpdate = async (...args: any[]) => {
        capturedArgs = args;
        return { _id: productId, viewCount: 1 };
    };

    try {
        const repo = new ProductRepository();
        const result = await repo.incrementViewCount(productId.toString());
        assert.deepEqual(capturedArgs[0], { _id: productId.toString(), isActive: true });
        assert.deepEqual(capturedArgs[1], { $inc: { viewCount: 1 } });
        assert.equal(result?._id.toString(), productId.toString());
    } finally {
        (ProductModel as any).findOneAndUpdate = originalUpdate;
    }
});

test("recordView rejects invalid product ID and inactive/not found products", async () => {
    const service: any = new ProductService();
    service.repo = {
        incrementViewCount: async () => null,
    };

    await assert.rejects(
        () => service.recordView("invalid-id"),
        /Invalid product ID/
    );

    await assert.rejects(
        () => service.recordView(new Types.ObjectId().toString()),
        /Product not found or inactive/
    );
});

test("product view guard suppresses duplicates and respects cooldown", () => {
    let currentTime = 10_000;
    const guard = createProductViewGuard({
        dedupeWindowMs: 500,
        rateWindowMs: 2_000,
        maxRequestsPerWindow: 10,
        now: () => currentTime,
    });

    const productId = new Types.ObjectId().toString();
    const request: any = {
        params: { productId },
        user: { id: "user-123" },
        get: () => "mobile-app",
        socket: {},
    };

    let statusCode = 200;
    const response: any = {
        setHeader: () => undefined,
        status: (code: number) => {
            statusCode = code;
            return response;
        },
        json: () => response,
    };

    let acceptedCount = 0;
    guard(request, response, () => { acceptedCount++; });
    assert.equal(acceptedCount, 1);

    // Immediate repeat within deduplication window
    guard(request, response, () => { acceptedCount++; });
    assert.equal(acceptedCount, 1);
    assert.equal(statusCode, 429);

    // After cooldown
    currentTime += 501;
    guard(request, response, () => { acceptedCount++; });
    assert.equal(acceptedCount, 2);
});

test("product create and update operations strip arbitrary viewCount and soldCount", async () => {
    const service: any = new ProductService();
    let capturedCreate: any = null;
    let capturedUpdate: any = null;

    const originalUpdateOne = (ProductModel as any).updateOne;
    (ProductModel as any).updateOne = async (_filter: any, update: any) => {
        capturedUpdate = update?.$set || update;
        return { modifiedCount: 1 };
    };

    service.repo = {
        create: async (data: any) => (capturedCreate = data),
        findById: async () => ({ _id: new Types.ObjectId(), category: new Types.ObjectId() }),
        update: async (_id: string, data: any) => (capturedUpdate = data),
    };

    service.generateUniqueSlug = async () => "test-slug";
    service.getCategoryAdditionalHandling = async () => null;

    try {
        await service.create({
            name: "Test",
            viewCount: 9999,
            soldCount: 8888,
        });

        await service.update(new Types.ObjectId().toString(), {
            name: "Updated",
            viewCount: 9999,
            soldCount: 8888,
        });

        assert.equal(capturedCreate.viewCount, undefined);
        assert.equal(capturedCreate.soldCount, undefined);
        assert.equal(capturedUpdate.viewCount, undefined);
        assert.equal(capturedUpdate.soldCount, undefined);
    } finally {
        (ProductModel as any).updateOne = originalUpdateOne;
    }
});

test("most viewed listing provides dynamic rankings and normalized counts", async () => {
    const service: any = new ProductService();
    const id1 = new Types.ObjectId();
    const id2 = new Types.ObjectId();

    service.repo = {
        findMostViewed: async () => ({
            items: [
                { _id: id1, name: "Popular", viewCount: 50, price: 100 },
                { _id: id2, name: "Legacy", price: 50 },
            ],
            total: 2,
            page: 1,
            limit: 10,
        }),
    };

    const result = await service.getMostViewed({});
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].rank, 1);
    assert.equal(result.items[0].viewCount, 50);
    assert.equal(result.items[1].rank, 2);
    assert.equal(result.items[1].viewCount, 0);
    assert.equal(result.items[1].customerSellingPrice, 50);
});

test("most bought listing provides dynamic rankings and normalized counts", async () => {
    const service: any = new ProductService();
    const id1 = new Types.ObjectId();
    const id2 = new Types.ObjectId();

    service.repo = {
        findMostBought: async () => ({
            items: [
                { _id: id1, name: "BestSeller", soldCount: 120, customerSellingPrice: 40 },
                { _id: id2, name: "SecondBest", soldCount: 60, customerSellingPrice: 80 },
            ],
            total: 2,
            page: 1,
            limit: 10,
        }),
    };

    const result = await service.getMostBought({});
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].rank, 1);
    assert.equal(result.items[0].soldCount, 120);
    assert.equal(result.items[1].rank, 2);
    assert.equal(result.items[1].soldCount, 60);
});

test("most viewed and most bought pass undefined limit for unlimited requests", async () => {
    const service: any = new ProductService();
    let viewedOptionsPassed: any;
    let boughtOptionsPassed: any;

    service.repo = {
        findMostViewed: async (options: any) => {
            viewedOptionsPassed = options;
            return { items: [], total: 0, page: 1, limit: 0 };
        },
        findMostBought: async (options: any) => {
            boughtOptionsPassed = options;
            return { items: [], total: 0, page: 1, limit: 0 };
        },
    };

    await service.getMostViewed({});
    assert.equal(viewedOptionsPassed.limit, undefined);

    await service.getMostViewed({ limit: "unlimited" });
    assert.equal(viewedOptionsPassed.limit, undefined);

    await service.getMostBought({});
    assert.equal(boughtOptionsPassed.limit, undefined);

    await service.getMostBought({ limit: "all" });
    assert.equal(boughtOptionsPassed.limit, undefined);
});

test("recordOrderSales increments product soldCount by total purchased quantity", async () => {
    const orderId = new Types.ObjectId();
    const prodA = new Types.ObjectId();
    const prodB = new Types.ObjectId();

    const mockOrder = {
        _id: orderId,
        items: [
            { product: prodA, quantity: 3 },
            { product: prodB, quantity: 2 },
            { product: prodA, quantity: 1 }, // Same product, different line/variant -> total prodA = 4
        ],
    };

    const originalOrderUpdate = (OrderModel as any).findOneAndUpdate;
    const originalProdUpdate = (ProductModel as any).updateOne;
    const productIncrements: Record<string, number> = {};

    (OrderModel as any).findOneAndUpdate = async () => mockOrder;
    (ProductModel as any).updateOne = async (filter: any, update: any) => {
        const id = filter._id.toString();
        productIncrements[id] = (productIncrements[id] || 0) + (update.$inc?.soldCount || 0);
        return { modifiedCount: 1 };
    };

    try {
        const success = await recordOrderSales(orderId);
        assert.equal(success, true);
        assert.equal(productIncrements[prodA.toString()], 4);
        assert.equal(productIncrements[prodB.toString()], 2);
    } finally {
        (OrderModel as any).findOneAndUpdate = originalOrderUpdate;
        (ProductModel as any).updateOne = originalProdUpdate;
    }
});

test("idempotent recordOrderSales prevents duplicate increments", async () => {
    const orderId = new Types.ObjectId();
    const originalOrderUpdate = (OrderModel as any).findOneAndUpdate;
    let callCount = 0;

    // First call returns order, second call returns null because salesCounted is already true
    (OrderModel as any).findOneAndUpdate = async () => {
        callCount++;
        return callCount === 1
            ? { _id: orderId, items: [{ product: new Types.ObjectId(), quantity: 1 }] }
            : null;
    };

    const originalProdUpdate = (ProductModel as any).updateOne;
    let prodUpdates = 0;
    (ProductModel as any).updateOne = async () => {
        prodUpdates++;
        return { modifiedCount: 1 };
    };

    try {
        const first = await recordOrderSales(orderId);
        const second = await recordOrderSales(orderId);
        assert.equal(first, true);
        assert.equal(second, false);
        assert.equal(prodUpdates, 1);
    } finally {
        (OrderModel as any).findOneAndUpdate = originalOrderUpdate;
        (ProductModel as any).updateOne = originalProdUpdate;
    }
});

test("revertOrderSales decrements product soldCount safely on order cancellation", async () => {
    const orderId = new Types.ObjectId();
    const prodId = new Types.ObjectId();

    const mockOrder = {
        _id: orderId,
        items: [{ product: prodId, quantity: 3 }],
    };

    const originalOrderUpdate = (OrderModel as any).findOneAndUpdate;
    const originalProdUpdate = (ProductModel as any).updateOne;
    let capturedUpdatePipeline: any = null;

    (OrderModel as any).findOneAndUpdate = async () => mockOrder;
    (ProductModel as any).updateOne = async (filter: any, update: any) => {
        capturedUpdatePipeline = update;
        return { modifiedCount: 1 };
    };

    try {
        const reverted = await revertOrderSales(orderId);
        assert.equal(reverted, true);
        assert.ok(Array.isArray(capturedUpdatePipeline));
        assert.deepEqual(
            capturedUpdatePipeline[0].$set.soldCount.$max[0],
            0
        );
    } finally {
        (OrderModel as any).findOneAndUpdate = originalOrderUpdate;
        (ProductModel as any).updateOne = originalProdUpdate;
    }
});

test("backfillHistoricalSales accurately calculates product totals in dry-run mode", async () => {
    const prodA = new Types.ObjectId();
    const prodB = new Types.ObjectId();

    const mockOrders = [
        {
            _id: new Types.ObjectId(),
            items: [
                { product: prodA, quantity: 5 },
                { product: prodB, quantity: 2 },
            ],
        },
        {
            _id: new Types.ObjectId(),
            items: [
                { product: prodA, quantity: 3 },
            ],
        },
    ];

    const originalFind = (OrderModel as any).find;
    (OrderModel as any).find = () => ({
        select: () => ({
            lean: async () => mockOrders,
        }),
    });

    try {
        const summary = await backfillHistoricalSales({ dryRun: true });
        assert.equal(summary.dryRun, true);
        assert.equal(summary.totalEligibleOrders, 2);
        assert.equal(summary.totalQuantityCounted, 10);
        assert.equal(summary.productTotals[prodA.toString()], 8);
        assert.equal(summary.productTotals[prodB.toString()], 2);
    } finally {
        (OrderModel as any).find = originalFind;
    }
});
