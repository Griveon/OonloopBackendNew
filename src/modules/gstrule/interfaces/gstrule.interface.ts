import { Document, Types } from "mongoose";

export interface IGSTRule {
    hsnCode: string;
    hsnDescription: string;

    igst: number;
    cgst: number;
    sgst: number;

    isActive?: boolean;

    createdBy?: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IGSTRuleDocument extends IGSTRule, Document { }