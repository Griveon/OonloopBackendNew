import { Document, Types } from "mongoose";

export interface IPlanFeature {
    plan: Types.ObjectId;
    feature: Types.ObjectId;

    value: number | boolean;
    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPlanFeatureDocument extends IPlanFeature, Document { }