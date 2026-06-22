import { Document, Types } from "mongoose";

export enum ProductContainerType {
    CATEGORY = "CATEGORY",
    PRODUCT_CATEGORY = "PRODUCT_CATEGORY",
    PRODUCTS = "PRODUCTS",
}

export interface IProductContainer {

    title: string;

    subtitle?: string;

    type: ProductContainerType;

    categories?: Types.ObjectId[];

    productCategories?: Types.ObjectId[];

    products?: Types.ObjectId[];

    position: number;

    bannerImage?: string;

    isActive: boolean;

    createdAt?: Date;

    updatedAt?: Date;
}

export interface IProductContainerDocument
    extends IProductContainer,
    Document { }