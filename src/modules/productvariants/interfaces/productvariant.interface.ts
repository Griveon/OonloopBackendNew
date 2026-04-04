import { Document, Types } from "mongoose";

export interface IVariantOption {
    value: string;
    label: string;
    meta?: Record<string, any>;
    isActive?: boolean;
}

export interface IProductVariant {
    name: string; 
    slug?: string; 
    label: string;

    inputType: "text" | "number" | "select" | "color";

    options?: IVariantOption[];

    isRequired?: boolean;
    isFilterable?: boolean;
    isGlobal?: boolean;

    vendorId?: Types.ObjectId;

    isActive?: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IProductVariantDocument
    extends IProductVariant,
    Document { }