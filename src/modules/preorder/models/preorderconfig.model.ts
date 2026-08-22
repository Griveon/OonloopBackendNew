import mongoose, { Schema, Model } from "mongoose";
import type { IPreorderConfigDocument } from "../interfaces/preorder.interface.js";
import { PREORDER_DEFAULT_HORIZON_DAYS } from "../constants/preorder.constants.js";

const slotSchema = new Schema(
    {
        label: { type: String, required: true, trim: true },
        start: { type: String, required: true }, // "HH:mm"
        end: { type: String, required: true }, // "HH:mm"
    },
    { _id: true }
);

const sameDaySchema = new Schema(
    {
        enabled: { type: Boolean, default: false },
        readyWithinHours: { type: Number, default: 2, min: 0 },
        cutoffTime: { type: String, default: "" }, // "" = no cutoff
    },
    { _id: false }
);

const scheduledSchema = new Schema(
    {
        enabled: { type: Boolean, default: false },
        minLeadDays: { type: Number, default: 0, min: 0 },
        horizonDays: {
            type: Number,
            default: PREORDER_DEFAULT_HORIZON_DAYS,
            min: 1,
        },
        slots: { type: [slotSchema], default: [] },
    },
    { _id: false }
);

const preorderConfigSchema = new Schema<IPreorderConfigDocument>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            unique: true, // one config per product
            index: true,
        },
        vendor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        isActive: { type: Boolean, default: true, index: true },
        sameDay: { type: sameDaySchema, default: () => ({}) },
        scheduled: { type: scheduledSchema, default: () => ({}) },
    },
    { timestamps: true }
);

export const PreorderConfigModel: Model<IPreorderConfigDocument> =
    mongoose.models.PreorderConfig ||
    mongoose.model<IPreorderConfigDocument>(
        "PreorderConfig",
        preorderConfigSchema
    );
