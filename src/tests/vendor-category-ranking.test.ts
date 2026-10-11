import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { VendorCategoryModel } from "../modules/vendorcategory/models/vendorcategory.model.js";
import { VendorCategoryRepository } from "../modules/vendorcategory/repositories/vendorcategory.repository.js";
import { VendorCategoryService } from "../modules/vendorcategory/services/vendorcategory.service.js";
import { ProductModel } from "../modules/product/models/product.model.js";
import { createCategoryClickGuard } from "../modules/vendorcategory/middlewares/categoryclick.middleware.js";

test("new categories default clickCount to zero", () => {
    const category = new VendorCategoryModel({ name: "Fresh Food", isActive: true });
    assert.equal(category.clickCount, 0);
});

test("public categories receive zero-normalized counts and global ranks", async () => {
    const service: any = new VendorCategoryService();
    service.repo = {
        findAll: async () => [
            { _id: new Types.ObjectId(), name: "High", clickCount: 20 },
            { _id: new Types.ObjectId(), name: "Legacy" },
        ],
    };

    const categories: any[] = await service.getAll(undefined);
    assert.equal(categories[0].rank, 1);
    assert.equal(categories[0].clickCount, 20);
    assert.equal(categories[1].rank, 2);
    assert.equal(categories[1].clickCount, 0);
});

test("vendor management listing is not given public ranking fields", async () => {
    const source = [{ _id: new Types.ObjectId(), name: "Alphabetical", clickCount: 3 }];
    const service: any = new VendorCategoryService();
    service.repo = { findAll: async () => source };
    assert.equal(await service.getAll("vendor"), source);
});

test("public repository sorting is clickCount descending with deterministic id tie-break", async () => {
    const originalDistinct = (ProductModel as any).distinct;
    const originalFind = (VendorCategoryModel as any).find;
    let sort: any;
    (ProductModel as any).distinct = async () => [new Types.ObjectId()];
    (VendorCategoryModel as any).find = () => ({
        sort: (value: any) => {
            sort = value;
            return { lean: async () => [] };
        },
    });

    try {
        await new VendorCategoryRepository().findAll();
        assert.deepEqual(sort, { clickCount: -1, _id: 1 });
    } finally {
        (ProductModel as any).distinct = originalDistinct;
        (VendorCategoryModel as any).find = originalFind;
    }
});

test("click recording uses one active-only atomic increment", async () => {
    const categoryId = new Types.ObjectId();
    const originalUpdate = (VendorCategoryModel as any).findOneAndUpdate;
    let captured: any[] = [];
    (VendorCategoryModel as any).findOneAndUpdate = async (...args: any[]) => {
        captured = args;
        return { _id: categoryId };
    };

    try {
        const result = await new VendorCategoryRepository().incrementClick(categoryId.toString());
        assert.deepEqual(captured[0], { _id: categoryId.toString(), isActive: true });
        assert.deepEqual(captured[1], { $inc: { clickCount: 1 } });
        assert.equal(result?._id.toString(), categoryId.toString());
    } finally {
        (VendorCategoryModel as any).findOneAndUpdate = originalUpdate;
    }
});

test("invalid and inactive categories are rejected", async () => {
    const service: any = new VendorCategoryService();
    service.repo = { incrementClick: async () => null };
    await assert.rejects(service.recordClick("invalid"), /Invalid category ID/);
    await assert.rejects(service.recordClick(new Types.ObjectId().toString()), /not found or inactive/);
});

test("normal create and update operations cannot assign clickCount", async () => {
    const service: any = new VendorCategoryService();
    let created: any;
    let updated: any;
    service.repo = {
        create: async (data: any) => (created = data),
        findById: async () => ({ _id: new Types.ObjectId() }),
        update: async (_id: string, data: any) => (updated = data),
    };

    await service.create({ name: "Category", clickCount: 999 });
    await service.update(new Types.ObjectId().toString(), { name: "Renamed", clickCount: 999 });
    assert.equal(created.clickCount, undefined);
    assert.equal(updated.clickCount, undefined);
});

test("click guard suppresses immediate duplicates and resets after cooldown", () => {
    let currentTime = 1_000;
    const guard = createCategoryClickGuard({
        dedupeWindowMs: 100,
        rateWindowMs: 1_000,
        maxRequestsPerWindow: 10,
        now: () => currentTime,
    });
    const request: any = {
        params: { categoryId: new Types.ObjectId().toString() },
        user: { id: new Types.ObjectId().toString() },
        get: () => "test-agent",
        socket: {},
    };
    let statusCode = 200;
    const response: any = {
        setHeader: () => undefined,
        status: (code: number) => { statusCode = code; return response; },
        json: () => response,
    };
    let accepted = 0;

    guard(request, response, () => { accepted++; });
    guard(request, response, () => { accepted++; });
    assert.equal(accepted, 1);
    assert.equal(statusCode, 429);

    currentTime += 101;
    guard(request, response, () => { accepted++; });
    assert.equal(accepted, 2);
});
