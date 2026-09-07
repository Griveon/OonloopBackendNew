import mongoose, { Schema, Model } from "mongoose";
import type { IBuyForMeItemDocument } from "../interfaces/buyformeitem.interface.js";

const buyForMeItemSchema = new Schema<IBuyForMeItemDocument>(
    {
        request: {
            type: Schema.Types.ObjectId,
            ref: "BuyForMeRequest",
            required: true,
            index: true,
        },

        source: {
            type: String,
            enum: ["catalog", "typed", "uploaded"],
            required: true,
        },
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        variant: { type: Schema.Types.ObjectId },

        name: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
        unit: { type: String, trim: true, default: "" },
        image: { type: String, default: "" },

        estimatedPrice: { type: Number },
        status: {
            type: String,
            enum: ["requested", "available", "unavailable", "purchased"],
            default: "requested",
            index: true,
        },
        actualPrice: { type: Number },
        note: { type: String, default: "" },
    },
    { timestamps: true }
);

export const BuyForMeItemModel: Model<IBuyForMeItemDocument> =
    mongoose.models.BuyForMeItem ||
    mongoose.model<IBuyForMeItemDocument>("BuyForMeItem", buyForMeItemSchema);
