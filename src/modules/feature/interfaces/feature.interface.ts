import { Document } from "mongoose";

export type FeatureType = "number" | "boolean";

export interface IFeature {
    key: string;
    name: string;
    description?: string;

    type: FeatureType;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IFeatureDocument extends IFeature, Document { }