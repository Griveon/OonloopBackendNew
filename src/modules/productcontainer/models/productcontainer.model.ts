import mongoose, { Schema, Model } from "mongoose";
import {
    ProductContainerType,
    type IProductContainerDocument,
} from "../interfaces/productcontainer.interface.js";

const ProductContainerSchema =
    new Schema<IProductContainerDocument>(
        {
            title: {
                type: String,
                required: true,
                trim: true,
            },

            subtitle: {
                type: String,
                default: "",
            },

            type: {
                type: String,
                enum: Object.values(ProductContainerType),
                required: true,
                index: true,
            },

            categories: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "VendorCategory",
                },
            ],

            productCategories: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "ProductCategory",
                },
            ],

            products: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Product",
                },
            ],

            bannerImage: {
                type: String,
                default: "",
            },

            position: {
                type: Number,
                default: 0,
            },

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },
        },
        {
            timestamps: true,
        }
    );

export const ProductContainerModel: Model<IProductContainerDocument> =
    mongoose.model<IProductContainerDocument>(
        "ProductContainer",
        ProductContainerSchema
    );