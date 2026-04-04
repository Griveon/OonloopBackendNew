import mongoose, { Schema, Model } from "mongoose";
import type { IGSTRuleDocument } from "../interfaces/gstrule.interface.js";

const GSTRuleSchema: Schema<IGSTRuleDocument> = new Schema(
    {
        hsnCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },
        hsnDescription: {
            type: String,
            required: true,
            trim: true
        },
        igst: {
            type: Number,
            required: true
        },
        cgst: {
            type: Number,
            required: true
        },
        sgst: {
            type: Number,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            index: true
        }
    },
    { timestamps: true }
);

export const GSTRuleModel: Model<IGSTRuleDocument> =
    mongoose.model<IGSTRuleDocument>("GSTRule", GSTRuleSchema);