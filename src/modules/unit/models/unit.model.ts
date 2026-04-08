
import mongoose, { Schema, Model, Document } from "mongoose";
import type { IUnit } from "../interfaces/unit.interface.js";

export interface IUnitDocument extends IUnit, Document { }

const unitSchema = new Schema<IUnitDocument>({
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    unitValue: { type: Number, min: 0 },
    symbol: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Optional unique index on shortName + symbol
unitSchema.index({ shortName: 1, symbol: 1 }, { unique: true });

export const UnitModel: Model<IUnitDocument> = mongoose.model<IUnitDocument>("Unit", unitSchema);