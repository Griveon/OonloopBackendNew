import { Document, Types } from "mongoose";

export interface IProductView {
    user: Types.ObjectId;
    product: Types.ObjectId;
    viewedAt?: Date;
}

export interface IProductViewDocument
    extends IProductView,
    Document { }