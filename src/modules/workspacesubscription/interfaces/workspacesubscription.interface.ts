import { Document, Types } from "mongoose";

export interface IWorkspaceSubscriptionFeature {
    key: string;
    value: number | boolean;
}

export interface IWorkspaceSubscription {
    user: Types.ObjectId;
    workspace: Types.ObjectId;
    plan: Types.ObjectId;

    status: "active" | "cancelled" | "expired" | "pending";

    startDate: Date;
    endDate: Date;

    autoRenew: boolean;

    features: IWorkspaceSubscriptionFeature[];

    paymentId?: string;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IWorkspaceSubscriptionDocument
    extends IWorkspaceSubscription,
    Document { }