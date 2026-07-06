import { Document } from "mongoose";

export type AppPlatform = "android" | "ios";

export interface IAppVersion {
    platform: AppPlatform;

    latestVersionCode: number;
    latestVersionName: string;

    minimumVersionCode: number;
    forceUpdate: boolean;

    updateTitle: string;
    updateMessage: string;

    playStoreUrl?: string;
    appStoreUrl?: string;

    isActive: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAppVersionDocument extends IAppVersion, Document { }