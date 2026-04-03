// currency.interface.ts
import { Document } from "mongoose";

export interface ICurrency {
    code: string;
    symbol: string;
    name: string;
    isActive: boolean;
}

export interface ICurrencyDocument extends ICurrency, Document { }