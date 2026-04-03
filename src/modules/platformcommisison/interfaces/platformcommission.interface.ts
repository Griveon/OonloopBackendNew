import { Document, Types } from "mongoose";

export type CommissionType = "percentage" | "fixed";

export interface IPlatformCommission {

    type: CommissionType;

    value: number;

    minAmount?: number; 
    maxAmount?: number; 

    isActive: boolean;

    notes?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPlatformCommissionDocument
    extends IPlatformCommission,
    Document { }