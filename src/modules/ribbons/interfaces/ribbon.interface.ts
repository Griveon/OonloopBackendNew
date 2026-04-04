import { Document, Types } from "mongoose";

export type RibbonType = "manual" | "auto" | "system";
export type RibbonPosition =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

export interface IRibbonCondition {
    field: string;
    operator: "gt" | "lt" | "eq" | "gte" | "lte";
    value: any;
}

export interface IRibbon {
    title: string;
    slug?: string;

    type: RibbonType;

    color?: string;
    textColor?: string;

    position?: RibbonPosition;

    priority?: number;

    expiresAt?: Date;

    isGlobal?: boolean;

    conditions?: IRibbonCondition[];

    isActive?: boolean;

    createdBy?: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IRibbonDocument extends IRibbon, Document { }