import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { MemoryCache, appCache } from "../utils/cache.util.js";
import { performanceMonitor } from "../middlewares/performance.middleware.js";
import { ProductModel } from "../modules/product/models/product.model.js";
import { ProductSearchRepository } from "../modules/product/repositories/globalproductsearch.repository.js";
import { VendorCategoryRepository } from "../modules/vendorcategory/repositories/vendorcategory.repository.js";
import { VendorCategoryModel } from "../modules/vendorcategory/models/vendorcategory.model.js";
import { ProductCategoryRepository } from "../modules/productcategories/repositories/productcategory.repository.js";
import { ProductCategoryModel } from "../modules/productcategories/models/productcategory.model.js";
import { CartService } from "../modules/cart/services/cart.service.js";
import { OrderService } from "../modules/order/services/order.service.js";
import { OrderModel } from "../modules/order/models/order.model.js";
import { OrderVendorModel } from "../modules/vendororder/models/vendororder.model.js";

// 1. In-Memory Cache Tests
test("MemoryCache stores, retrieves, and respects TTL expiration", async () => {
    const cache = new MemoryCache(10);
    cache.set("key1", { data: 123 }, 1); // 1 second TTL

    assert.deepEqual(cache.get("key1"), { data: 123 });

    // Wait 1.1s for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(cache.get("key1"), undefined);
});

test("MemoryCache enforces max capacity with oldest item eviction", () => {
    const cache = new MemoryCache(3);
    cache.set("a", 1, 60);
    cache.set("b", 2, 60);
    cache.set("c", 3, 60);
    cache.set("d", 4, 60); // Evicts "a"

    assert.equal(cache.get("a"), undefined);
    assert.equal(cache.get("b"), 2);
    assert.equal(cache.get("c"), 3);
    assert.equal(cache.get("d"), 4);
});

test("MemoryCache prefix invalidation deletes matching keys", () => {
    const cache = new MemoryCache(20);
    cache.set("vendor_cat_1", 1, 60);
    cache.set("vendor_cat_2", 2, 60);
    cache.set("other_key", 99, 60);

    const deleted = cache.deletePrefix("vendor_cat_");
    assert.equal(deleted, 2);
    assert.equal(cache.get("vendor_cat_1"), undefined);
    assert.equal(cache.get("vendor_cat_2"), undefined);
    assert.equal(cache.get("other_key"), 99);
});

// 2. Performance Monitoring Middleware Tests
test("performanceMonitor middleware passes request and sets X-Response-Time on finish", () => {
    let nextCalled = false;
    const req: any = { method: "GET", url: "/api/v1/products/recent_products", originalUrl: "/api/v1/products/recent_products" };
    const headers: Record<string, string> = {};
    const finishListeners: (() => void)[] = [];

    const res: any = {
        statusCode: 200,
        headersSent: false,
        setHeader: (name: string, value: string) => {
            headers[name.toLowerCase()] = value;
        },
        getHeader: (name: string) => headers[name.toLowerCase()],
        on: (event: string, callback: () => void) => {
            if (event === "finish") finishListeners.push(callback);
        },
    };

    performanceMonitor(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(finishListeners.length, 1);

    // Trigger response finish
    finishListeners[0]?.();
    assert.ok(headers["x-response-time"]);
    assert.match(headers["x-response-time"], /^\d+(\.\d+)?ms$/);
});

// 3. Vendor Category Caching and Invalidation
test("VendorCategoryRepository caches findAll and invalidates on update", async () => {
    appCache.deletePrefix("vendor_cat_");

    let dbQueryCount = 0;
    const originalFind = (VendorCategoryModel as any).find;
    (VendorCategoryModel as any).find = () => {
        dbQueryCount++;
        return {
            sort: () => ({
                lean: async () => [{ _id: new Types.ObjectId(), name: "Groceries", clickCount: 5 }],
            }),
        };
    };

    try {
        const repo = new VendorCategoryRepository();
        const res1 = await repo.findAll("vendor");
        assert.equal(dbQueryCount, 1);
        assert.equal(res1.length, 1);

        // Second call should come from cache with 0 additional DB queries
        const res2 = await repo.findAll("vendor");
        assert.equal(dbQueryCount, 1);
        assert.deepEqual(res2, res1);

        // Update triggers cache invalidation
        const originalFindByIdAndUpdate = (VendorCategoryModel as any).findByIdAndUpdate;
        (VendorCategoryModel as any).findByIdAndUpdate = async () => ({ _id: new Types.ObjectId() });
        await repo.update(new Types.ObjectId().toString(), { name: "New Name" });
        (VendorCategoryModel as any).findByIdAndUpdate = originalFindByIdAndUpdate;

        // Third call should query DB again
        await repo.findAll("vendor");
        assert.equal(dbQueryCount, 2);
    } finally {
        (VendorCategoryModel as any).find = originalFind;
        appCache.deletePrefix("vendor_cat_");
    }
});

// 4. Product Category Caching and Invalidation
test("ProductCategoryRepository caches findByVendorCategory and invalidates on create", async () => {
    appCache.deletePrefix("product_cat_");

    let dbQueryCount = 0;
    const originalFind = (ProductCategoryModel as any).find;
    (ProductCategoryModel as any).find = () => {
        dbQueryCount++;
        return {
            lean: async () => [{ _id: new Types.ObjectId(), name: "Dairy", isActive: true }],
        };
    };

    try {
        const repo = new ProductCategoryRepository();
        const vcId = new Types.ObjectId().toString();

        const res1 = await repo.findByVendorCategory(vcId);
        assert.equal(dbQueryCount, 1);
        assert.equal(res1.length, 1);

        // Second call hits cache
        const res2 = await repo.findByVendorCategory(vcId);
        assert.equal(dbQueryCount, 1);
        assert.deepEqual(res2, res1);

        // Create invalidates cache
        const originalCreate = (ProductCategoryModel as any).create;
        (ProductCategoryModel as any).create = async (d: any) => d;
        await repo.create({ name: "Snacks" } as any);
        (ProductCategoryModel as any).create = originalCreate;

        // Third call queries DB
        await repo.findByVendorCategory(vcId);
        assert.equal(dbQueryCount, 2);
    } finally {
        (ProductCategoryModel as any).find = originalFind;
        appCache.deletePrefix("product_cat_");
    }
});

// 5. Order Batch Product Lookups
test("OrderService.create batches product lookups in a single $in query", async () => {
    const service: any = new OrderService();
    service.repo = {
        create: async (data: any) => ({ ...data, _id: new Types.ObjectId(), orderNumber: "ORD-12345" }),
    };

    const prodId1 = new Types.ObjectId().toString();
    const prodId2 = new Types.ObjectId().toString();
    const vendorId = new Types.ObjectId();

    let productFindQueries = 0;
    let queriedIds: any = null;

    const originalFind = (ProductModel as any).find;
    const originalOrderFindOne = (OrderModel as any).findOne;
    const originalVendorOrderCount = (OrderVendorModel as any).countDocuments;
    const originalVendorOrderCreate = (OrderVendorModel as any).create;

    (OrderModel as any).findOne = () => ({
        sort: () => ({
            select: () => ({
                lean: async () => null,
            }),
        }),
    });

    (OrderVendorModel as any).countDocuments = async () => 0;
    (OrderVendorModel as any).create = async (d: any) => d;

    (ProductModel as any).find = (filter: any) => {
        productFindQueries++;
        queriedIds = filter._id?.$in;
        return {
            lean: async () => [
                {
                    _id: new Types.ObjectId(prodId1),
                    vendorId,
                    name: "Product A",
                    price: 100,
                    customerSellingPrice: 100,
                    mrp: 120,
                    stock: 50,
                },
                {
                    _id: new Types.ObjectId(prodId2),
                    vendorId,
                    name: "Product B",
                    price: 200,
                    customerSellingPrice: 200,
                    mrp: 250,
                    stock: 50,
                },
            ],
        };
    };

    try {
        const orderData = {
            user: new Types.ObjectId(),
            paymentMethod: new Types.ObjectId(),
            billingAddress: { fullAddress: "123 Street", pincode: "110001" },
            items: [
                { product: prodId1, quantity: 2 },
                { product: prodId2, quantity: 1 },
            ],
        };

        const result = await service.create(orderData);
        // Verified: Exactly 1 single batched find query was made for all products
        assert.equal(productFindQueries, 1);
        assert.deepEqual(queriedIds.map(String).sort(), [prodId1, prodId2].sort());
        assert.equal(result.order.subtotal, 400); // (100 * 2) + (200 * 1)
        assert.equal(result.order.items.length, 2);
    } finally {
        (ProductModel as any).find = originalFind;
        (OrderModel as any).findOne = originalOrderFindOne;
        (OrderVendorModel as any).countDocuments = originalVendorOrderCount;
        (OrderVendorModel as any).create = originalVendorOrderCreate;
    }
});
