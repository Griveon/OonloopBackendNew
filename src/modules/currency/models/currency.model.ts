import mongoose, { Schema, Model } from "mongoose";
import type { ICurrencyDocument } from "../interfaces/currency.interface.js";

const CurrencySchema: Schema<ICurrencyDocument> = new Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const CurrencyModel: Model<ICurrencyDocument> = mongoose.model<ICurrencyDocument>(
    "Currency",
    CurrencySchema
);