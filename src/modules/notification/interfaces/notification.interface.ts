import type { Document, Types } from "mongoose";

export type NotificationTargetType = "all" | "users" | "role";
export type NotificationStatus = "draft" | "sent" | "failed";

export interface INotification {
    title: string;
    paragraph: string;

    targetType: NotificationTargetType;

    userIds?: Types.ObjectId[];
    role?: string;

    imageUrl?: string;

    data?: Record<string, any>;

    status: NotificationStatus;

    totalUsers: number;
    totalTokens: number;

    successCount: number;
    failureCount: number;

    sentAt?: Date;

    createdBy?: Types.ObjectId;
}

export interface INotificationDocument extends INotification, Document { }

export interface CreateNotificationDTO {
    title: string;
    paragraph: string;

    targetType: NotificationTargetType;

    userIds?: string[];
    role?: string;

    imageUrl?: string;

    data?: Record<string, any>;
}