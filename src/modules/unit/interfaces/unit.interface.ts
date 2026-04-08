import { Document, Types } from "mongoose";

export interface IUnit {
    name: string;
    shortName: string;
    unitValue?: number;
    symbol: string;
    description?: string;
    isActive: boolean;
    createdBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUnitDocument extends IUnit, Document { }