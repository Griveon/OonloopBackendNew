import mongoose, {
    Schema,
    Model,
} from "mongoose";

import type {
    IProductViewDocument,
} from "../interfaces/productview.interface.js";

const ProductViewSchema =
    new Schema<IProductViewDocument>(
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true,
            },

            product: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true,
                index: true,
            },

            viewedAt: {
                type: Date,
                default: Date.now,
            },
        },
        {
            timestamps: true,
        }
    );

ProductViewSchema.index(
    {
        user: 1,
        product: 1,
    },
    {
        unique: true,
    }
);

export const ProductViewModel: Model<IProductViewDocument> =
    mongoose.model<IProductViewDocument>(
        "ProductView",
        ProductViewSchema
    );