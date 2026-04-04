import mongoose, { Schema, Model } from "mongoose";
import type { IRibbonDocument } from "../interfaces/ribbon.interface.js";

const conditionSchema = new Schema(
    {
        field: { type: String, required: true },
        operator: {
            type: String,
            enum: ["gt", "lt", "eq", "gte", "lte"],
            required: true,
        },
        value: { type: Schema.Types.Mixed, required: true },
    },
    { _id: false }
);

const RibbonSchema: Schema<IRibbonDocument> = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        slug: {
            type: String,
            trim: true,
            index: true,
        },

        type: {
            type: String,
            enum: ["manual", "auto", "system"],
            default: "manual",
            index: true,
        },

        color: {
            type: String,
            default: "#FF0000",
        },

        textColor: {
            type: String,
            default: "#FFFFFF",
        },

        position: {
            type: String,
            enum: ["top-left", "top-right", "bottom-left", "bottom-right"],
            default: "top-left",
        },

        priority: {
            type: Number,
            default: 0,
            index: true,
        },

        expiresAt: {
            type: Date,
            index: true,
        },

        isGlobal: {
            type: Boolean,
            default: true,
            index: true,
        },

        conditions: {
            type: [conditionSchema],
            default: [],
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
    },
    { timestamps: true }
);

RibbonSchema.index({ title: 1, createdBy: 1 }, { unique: true });

export const RibbonModel: Model<IRibbonDocument> =
    mongoose.model<IRibbonDocument>("Ribbon", RibbonSchema);