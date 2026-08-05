import mongoose, { Schema, Model } from "mongoose";
import type { IProduct, IProductImage, IProductVariant, IProductAttributes, IGSTDetails, IProductVideo } from "../interfaces/product.interface.js";

const imageSchema = new Schema<IProductImage>(
    {
        url: { type: String, required: true },
        name: { type: String, default: "" },
        alt: { type: String, default: "" },
        isPrimary: { type: Boolean, default: false },
        position: { type: Number, default: 0 },
    },
    { _id: false }
);

const availabilitySchema = new Schema(
    {
        type: {
            type: String,
            enum: ["always", "scheduled"],
            default: "always",
            index: true,
        },
        fromTime: {
            type: String,
            default: "",
        },
        toTime: {
            type: String,
            default: "",
        },
        fromMinutes: {
            type: Number,
            default: null,
        },
        toMinutes: {
            type: Number,
            default: null,
        },
    },
    { _id: false }
);

const variantSchema = new Schema<IProductVariant>(
    {
        attributes: { type: Map, of: Schema.Types.Mixed },
        images: [imageSchema],
        unit: { type: Schema.Types.ObjectId, ref: "Unit", index: true },
        unitValue: { type: Number, min: 0 },
        stock: { type: Number, default: 0 },
        sku: { type: String },
        price: { type: Number },
        mrp: { type: Number },
    },
    { _id: true }
);

const attributesSchema = new Schema<IProductAttributes>(
    {
        brand: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
        material: { type: String },
        pattern: { type: String },
        sleeveLength: { type: String },
        fit: { type: String },
    },
    { _id: false }
);

const gstSchema = new Schema<IGSTDetails>(
    {
        gstRuleId: { type: Schema.Types.ObjectId, ref: "GSTRule" },
        hsnCode: { type: String },
        gstPercent: { type: Number },
        gstAmount: { type: Number },
        priceIncludingGST: { type: Number },
    },
    { _id: false }
);

const videoSchema = new Schema<IProductVideo>(
    {
        url: { type: String, required: true },
        name: { type: String, default: "" },
        type: { type: String, default: "" },
        isPrimary: { type: Boolean, default: false },
        position: { type: Number, default: 0 },
    },
    { _id: false }
);

const productSchema = new Schema<IProduct>(
    {
        vendorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        productCategory: { type: Schema.Types.ObjectId, ref: "ProductCategory", required: true, index: true },
        category: { type: Schema.Types.ObjectId, ref: "VendorCategory", required: true, index: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        variants: [variantSchema],
        attributes: attributesSchema,
        images: { type: [imageSchema] },
        videos: { type: [videoSchema] },
        mrp: { type: Number, default: 0 },
        stock: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        isTrending: { type: Boolean, default: false },
        returnable: { type: Boolean, default: true },
        ribbon: { type: Schema.Types.ObjectId, ref: "Ribbon" },
        unit: { type: Schema.Types.ObjectId, ref: "Unit" },
        minQty: { type: Number, default: 1 },
        slug: { type: String, required: true, unique: true },
        gst: gstSchema,
        availability: {
            type: availabilitySchema,
            default: () => ({
                type: "always",
                fromTime: "",
                toTime: "",
                fromMinutes: null,
                toMinutes: null,
            }),
        },
        isMainCatalogProduct: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

productSchema.virtual("totalStock").get(function () {
    if (!this.variants || this.variants.length === 0) return this.stock;
    return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
});

productSchema.index({
    name: "text",
    description: "text",
    slug: "text",
});

export const ProductModel: Model<IProduct> = mongoose.model<IProduct>("Product", productSchema);