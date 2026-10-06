import type { Document } from "mongoose";
import { AppPlatform } from "../constants/appversion.constant.js";

export { AppPlatform };

export interface IAppVersion {
    platform: AppPlatform;
    latestVersion: string;
    latestBuildNumber: number;
    minimumSupportedVersion: string;
    minimumSupportedBuildNumber: number;
    forceUpdate: boolean;
    storeUrl?: string | undefined;
    message?: string | undefined;
    isActive: boolean;

    // Extensible properties for future roadmap
    maintenanceMode?: boolean | undefined;
    recommendedUpdate?: boolean | undefined;
    rolloutPercentage?: number | undefined;
    deprecatedBuilds?: number[] | undefined;

    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}

export interface IAppVersionDocument extends IAppVersion, Document {}

export interface IAppVersionCheckQuery {
    platform: AppPlatform;
    version?: string | undefined;
    buildNumber: number;
}

export interface IAppVersionCheckResponse {
    updateAvailable: boolean;
    forceUpdate: boolean;
    latestVersion: string;
    latestBuildNumber: number;
    storeUrl?: string | undefined;
    message?: string | undefined;
    maintenanceMode?: boolean | undefined;
}