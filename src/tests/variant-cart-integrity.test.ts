import assert from "node:assert/strict";
import test from "node:test";
import mongoose, { Types } from "mongoose";
import { ProductService } from "../modules/product/services/product.service.js";
import { ProductModel } from "../modules/product/models/product.model.js";
import { CartService } from "../modules/cart/services/cart.service.js";
import { calculateCartTotals } from "../modules/cart/models/cart.model.js";

const productIdA = new Types.ObjectId().toString();
const productIdB = new Types.ObjectId().toString();
const legacyVariantId = new Types.ObjectId().toString();

const makeVariantArray = (variants: any[]) => {
    const result: any = variants;
    result.id = (id: string) => result.find((variant: any) => variant._id.toString() === id) || null;
    return result;
};

const makeProduct = (id: string, variants: any[], stock = 10) => ({
    _id: new Types.ObjectId(id),
    name: `Product ${id}`,
    isActive: true,
    availability: { type: "always" },
    customerSellingPrice: 90,
    price: 80,
    mrp: 100,
    stock,
    images: [{ url: "https://example.com/product.jpg" }],
    gst: { gstPercent: 5, gstAmount: 4.5 },
    variants: makeVariantArray(variants),
});

const makeCartHarness = (products: Record<string, any>) => {
    const state: any = { items: [], version: 0 };
    const service: any = new CartService();
    const originalFindById = (ProductModel as any).findById;
    (ProductModel as any).findById = async (id: string) => products[id] || null;

    service.repo = {
        findOrCreate: async () => ({
            items: state.items.map((item: any) => ({ ...item })),
            version: state.version,
        }),
        save: async (cart: any) => {
            if (cart.version !== state.version) {
                throw new mongoose.Error.VersionError(
                    { _doc: { _id: new Types.ObjectId() } } as any,
                    cart.version,
                    []
                );
            }
            state.items = cart.items.map((item: any) => ({
                _id: item._id || new Types.ObjectId(),
                ...item,
            }));
            state.version++;
        },
    };

    return {
        service: service as CartService,
        state,
        restore: () => { (ProductModel as any).findById = originalFindById; },
    };
};

test("new products replace incoming variant IDs and retain explicit lineage", async () => {
    const originalExists = (ProductModel as any).exists;
    (ProductModel as any).exists = async () => null;
    const service: any = new ProductService();
    let created: any;
    service.repo = { create: async (payload: any) => (created = payload) };

    try {
        await service.create({
            name: "Catalog clone",
            variants: [
                { _id: legacyVariantId, price: 10, mrp: 10 },
                { _id: legacyVariantId, price: 10, mrp: 10 },
            ],
        });
        assert.notEqual(created.variants[0]._id.toString(), legacyVariantId);
        assert.notEqual(created.variants[1]._id.toString(), legacyVariantId);
        assert.notEqual(created.variants[0]._id.toString(), created.variants[1]._id.toString());
        assert.equal(created.variants[0].sourceVariantId.toString(), legacyVariantId);
    } finally {
        (ProductModel as any).exists = originalExists;
    }
});

test("product updates preserve owned IDs and re-key foreign/new variants", async () => {
    const ownedId = new Types.ObjectId();
    const foreignId = new Types.ObjectId();
    const existing: any = { category: undefined, variants: [{ _id: ownedId }] };
    const originalUpdateOne = (ProductModel as any).updateOne;
    let writtenVariants: any[] = [];
    (ProductModel as any).updateOne = async (_filter: any, update: any) => {
        if (update.$set?.variants) writtenVariants = update.$set.variants;
        return {};
    };
    const service: any = new ProductService();
    service.repo = { findById: async () => existing };

    try {
        await service.update(new Types.ObjectId().toString(), {
            variants: [
                { _id: ownedId, attributes: {}, price: 10, mrp: 10 },
                { _id: foreignId, attributes: {}, price: 10, mrp: 10 },
                { attributes: {}, price: 10, mrp: 10 },
            ],
        });
        assert.equal(writtenVariants[0]._id.toString(), ownedId.toString());
        assert.notEqual(writtenVariants[1]._id.toString(), foreignId.toString());
        assert.equal(writtenVariants[1].sourceVariantId.toString(), foreignId.toString());
        assert.ok(writtenVariants[2]._id instanceof Types.ObjectId);
    } finally {
        (ProductModel as any).updateOne = originalUpdateOne;
    }
});

test("two products sharing a legacy variant remain independent cart lines", async () => {
    const variantA = { _id: new Types.ObjectId(legacyVariantId), customerSellingPrice: 40, mrp: 50, stock: 8 };
    const variantB = { _id: new Types.ObjectId(legacyVariantId), customerSellingPrice: 60, mrp: 70, stock: 8 };
    const harness = makeCartHarness({
        [productIdA]: makeProduct(productIdA, [variantA]),
        [productIdB]: makeProduct(productIdB, [variantB]),
    });
    try {
        await harness.service.addToCart("user", { productId: productIdA, variantId: legacyVariantId, quantity: 1 });
        await harness.service.addToCart("user", { productId: productIdB, variantId: legacyVariantId, quantity: 1 });
        assert.equal(harness.state.items.length, 2);
        assert.deepEqual(harness.state.items.map((item: any) => item.product).sort(), [productIdA, productIdB].sort());
    } finally { harness.restore(); }
});

test("same product and variant increments one logical line", async () => {
    const variant = { _id: new Types.ObjectId(legacyVariantId), customerSellingPrice: 40, mrp: 50, stock: 8 };
    const harness = makeCartHarness({ [productIdA]: makeProduct(productIdA, [variant]) });
    try {
        await harness.service.addToCart("user", { productId: productIdA, variantId: legacyVariantId, quantity: 1 });
        await harness.service.addToCart("user", { productId: productIdA, variantId: legacyVariantId, quantity: 2 });
        assert.equal(harness.state.items.length, 1);
        assert.equal(harness.state.items[0].quantity, 3);
    } finally { harness.restore(); }
});

test("different variants under one product remain separate lines", async () => {
    const secondVariantId = new Types.ObjectId().toString();
    const product = makeProduct(productIdA, [
        { _id: new Types.ObjectId(legacyVariantId), customerSellingPrice: 40, mrp: 50, stock: 8 },
        { _id: new Types.ObjectId(secondVariantId), customerSellingPrice: 45, mrp: 55, stock: 8 },
    ]);
    const harness = makeCartHarness({ [productIdA]: product });
    try {
        await harness.service.addToCart("user", { productId: productIdA, variantId: legacyVariantId, quantity: 1 });
        await harness.service.addToCart("user", { productId: productIdA, variantId: secondVariantId, quantity: 1 });
        assert.equal(harness.state.items.length, 2);
    } finally { harness.restore(); }
});

test("simultaneous adds retry version conflicts without duplicate lines", async () => {
    const variant = { _id: new Types.ObjectId(legacyVariantId), customerSellingPrice: 40, mrp: 50, stock: 10 };
    const harness = makeCartHarness({ [productIdA]: makeProduct(productIdA, [variant]) });
    try {
        await Promise.all(Array.from({ length: 5 }, () =>
            harness.service.addToCart("user", {
                productId: productIdA,
                variantId: legacyVariantId,
                quantity: 1,
            })
        ));
        assert.equal(harness.state.items.length, 1);
        assert.equal(harness.state.items[0].quantity, 5);
    } finally { harness.restore(); }
});

test("variant must belong to the requested product", async () => {
    const otherId = new Types.ObjectId().toString();
    const product = makeProduct(productIdA, [{ _id: new Types.ObjectId(otherId), price: 10, mrp: 10, stock: 5 }]);
    const harness = makeCartHarness({ [productIdA]: product });
    try {
        await assert.rejects(
            harness.service.addToCart("user", { productId: productIdA, variantId: legacyVariantId, quantity: 1 }),
            /Variant not found for this product/
        );
    } finally { harness.restore(); }
});

test("stock and quantity validation reject invalid additions", async () => {
    const product = makeProduct(productIdA, [], 2);
    const harness = makeCartHarness({ [productIdA]: product });
    try {
        await assert.rejects(
            harness.service.addToCart("user", { productId: productIdA, quantity: 3 }),
            /Insufficient stock/
        );
        await assert.rejects(
            harness.service.addToCart("user", { productId: productIdA, quantity: 1.5 }),
            /positive integer/
        );
    } finally { harness.restore(); }
});

test("products without variants can be added without a variant ID", async () => {
    const harness = makeCartHarness({ [productIdA]: makeProduct(productIdA, [], 3) });
    try {
        await harness.service.addToCart("user", { productId: productIdA, quantity: 1 });
        assert.equal(harness.state.items.length, 1);
        assert.equal(harness.state.items[0].variant, undefined);
    } finally { harness.restore(); }
});

test("quantity update and removal continue to use cart-item IDs", async () => {
    const harness = makeCartHarness({ [productIdA]: makeProduct(productIdA, [], 5) });
    try {
        await harness.service.addToCart("user", { productId: productIdA, quantity: 1 });
        const itemId = harness.state.items[0]._id.toString();
        await harness.service.updateQuantity("user", itemId, 4);
        assert.equal(harness.state.items[0].quantity, 4);
        await harness.service.removeItem("user", itemId);
        assert.equal(harness.state.items.length, 0);
    } finally { harness.restore(); }
});

test("invalid and missing product IDs return readable errors", async () => {
    const harness = makeCartHarness({});
    try {
        await assert.rejects(
            harness.service.addToCart("user", { productId: "invalid", quantity: 1 }),
            /Invalid product ID/
        );
        await assert.rejects(
            harness.service.addToCart("user", { productId: productIdA, quantity: 1 }),
            /Product not found/
        );
    } finally { harness.restore(); }
});

test("server pricing rejects a selling price above MRP", async () => {
    const product = makeProduct(productIdA, [], 5);
    product.customerSellingPrice = 101;
    product.mrp = 100;
    const harness = makeCartHarness({ [productIdA]: product });
    try {
        await assert.rejects(
            harness.service.addToCart("user", { productId: productIdA, quantity: 1 }),
            /cannot exceed MRP/
        );
    } finally { harness.restore(); }
});

test("cart totals multiply unit price and GST by quantity", () => {
    const totals = calculateCartTotals([
        {
            product: new Types.ObjectId(),
            quantity: 3,
            price: 10,
            customerSellingPrice: 12.5,
            name: "Item",
            gstAmount: 1.25,
            total: 37.5,
        },
    ]);
    assert.deepEqual(totals, { totalItems: 3, subTotal: 37.5, totalGST: 3.75, grandTotal: 41.25 });
});
