import mongoose, { Schema, Model } from "mongoose";
import type { IShopperPhotoDocument } from "../interfaces/personalshopperphoto.interface.js";

const ShopperPhotoSchema = new Schema<IShopperPhotoDocument>(
    {
        booking: {
            type: Schema.Types.ObjectId,
            ref: "PersonalShopperBooking",
            required: true,
            index: true,
        },
        rider: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        imageUrl: { type: String, required: true },
        caption: { type: String, default: "" },

        storeId: { type: Schema.Types.ObjectId },
        storeName: { type: String, default: "" },

        type: {
            type: String,
            enum: ["info", "approval", "payment"],
            default: "info",
            index: true,
        },
        status: {
            type: String,
            enum: ["none", "pending", "approved", "rejected", "paid", "denied"],
            default: "none",
            index: true,
        },
        customerRemark: { type: String, default: "" },
        respondedAt: Date,
    },
    { timestamps: true }
);

export const ShopperPhotoModel: Model<IShopperPhotoDocument> =
    mongoose.models.ShopperPhoto ||
    mongoose.model<IShopperPhotoDocument>("ShopperPhoto", ShopperPhotoSchema);
