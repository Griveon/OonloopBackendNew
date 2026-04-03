import { Document, Types } from "mongoose";

export interface ICategoryLevel {
    name: string;
    code: string;
}

export interface IProductCategory {

    vendorCategory: Types.ObjectId;
    
    l1Category: ICategoryLevel;
    l2Category: ICategoryLevel;
    l3Category: ICategoryLevel;
    l4Category: ICategoryLevel;

    icon?: string;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IProductCategoryDocument
    extends IProductCategory,
    Document {}