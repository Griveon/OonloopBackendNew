import { Document, Types } from "mongoose";

export interface ICartItem {
    product: Types.ObjectId;
    variant?: Types.ObjectId;

    quantity: number;

    price: number;          
    mrp?: number;           

    name: string;           
    image?: string;         

    gstPercent?: number;
    gstAmount?: number;

    total: number;         
}

export interface ICart {
    user: Types.ObjectId;

    items: ICartItem[];

    totalItems: number;
    subTotal: number;
    totalGST: number;
    grandTotal: number;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICartDocument extends ICart, Document { }