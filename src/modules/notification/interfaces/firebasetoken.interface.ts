import { Document, Types } from "mongoose";

export type FirebaseDevicePlatform = "android" | "ios" | "web";

export interface IFirebaseToken {
    user: Types.ObjectId;

    token: string;

    platform: FirebaseDevicePlatform;

    deviceId?: string;

    deviceName?: string;

    appVersion?: string;

    isActive: boolean;

    lastUsedAt?: Date;

    createdAt?: Date;

    updatedAt?: Date;
}

export interface IFirebaseTokenDocument extends IFirebaseToken, Document { }

export interface SaveFirebaseTokenDTO {
    token: string;
    platform: FirebaseDevicePlatform;
    deviceId?: string;
    deviceName?: string;
    appVersion?: string;
}

export interface SendPushNotificationDTO {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}