import { AppVersionRepository } from "../repositories/appversion.repository.js";
import type { AppPlatform } from "../interfaces/appversion.interface.js";

export class AppVersionService {
    private repository: AppVersionRepository;

    constructor() {
        this.repository = new AppVersionRepository();
    }

    private validatePlatform(platform: string): AppPlatform {
        if (!platform) {
            throw new Error("Platform is required");
        }

        if (!["android", "ios"].includes(platform)) {
            throw new Error("Invalid platform");
        }

        return platform as AppPlatform;
    }

    async createOrUpdate(payload: any) {
        const platform = this.validatePlatform(payload.platform);

        const latestVersionCode = Number(payload.latestVersionCode);
        const minimumVersionCode = Number(payload.minimumVersionCode || payload.latestVersionCode);

        if (!latestVersionCode || latestVersionCode < 1) {
            throw new Error("Latest version code is required");
        }

        if (!payload.latestVersionName) {
            throw new Error("Latest version name is required");
        }

        if (!minimumVersionCode || minimumVersionCode < 1) {
            throw new Error("Minimum version code is required");
        }

        const data = {
            latestVersionCode,
            latestVersionName: String(payload.latestVersionName).trim(),

            minimumVersionCode,

            forceUpdate: Boolean(payload.forceUpdate),

            updateTitle:
                payload.updateTitle ||
                "Update Available",

            updateMessage:
                payload.updateMessage ||
                "A new version of the app is available. Please update to continue.",

            playStoreUrl:
                payload.playStoreUrl ||
                "",

            appStoreUrl:
                payload.appStoreUrl ||
                "",

            isActive:
                typeof payload.isActive === "boolean"
                    ? payload.isActive
                    : true,
        };

        return await this.repository.createOrUpdate(platform, data);
    }

    async checkVersion(payload: {
        platform: string;
        versionCode: string | number;
    }) {
        const platform = this.validatePlatform(payload.platform);

        const currentVersionCode = Number(payload.versionCode);

        if (!currentVersionCode || currentVersionCode < 1) {
            throw new Error("Current version code is required");
        }

        const appVersion = await this.repository.findByPlatform(platform);

        if (!appVersion) {
            return {
                updateAvailable: false,
                forceUpdate: false,
                message: "No app version configuration found",
            };
        }

        const latestVersionCode = Number(appVersion.latestVersionCode);
        const minimumVersionCode = Number(appVersion.minimumVersionCode);

        const updateAvailable = latestVersionCode > currentVersionCode;

        const forceUpdate =
            Boolean(appVersion.forceUpdate) ||
            currentVersionCode < minimumVersionCode;

        const storeUrl =
            platform === "android"
                ? appVersion.playStoreUrl
                : appVersion.appStoreUrl;

        return {
            platform: appVersion.platform,

            currentVersionCode,

            latestVersionCode: appVersion.latestVersionCode,
            latestVersionName: appVersion.latestVersionName,

            minimumVersionCode: appVersion.minimumVersionCode,

            updateAvailable,
            forceUpdate: updateAvailable ? forceUpdate : false,

            updateTitle: appVersion.updateTitle,
            updateMessage: appVersion.updateMessage,

            storeUrl,
            playStoreUrl: appVersion.playStoreUrl,
            appStoreUrl: appVersion.appStoreUrl,

            isActive: appVersion.isActive,
        };
    }

    async getAll() {
        return await this.repository.getAll();
    }

    async getById(id: any) {
        if (!id) {
            throw new Error("App version id is required");
        }

        const data = await this.repository.getById(id);

        if (!data) {
            throw new Error("App version not found");
        }

        return data;
    }

    async updateById(id: any, payload: any) {
        if (!id) {
            throw new Error("App version id is required");
        }

        const updatePayload: any = {};

        if (payload.platform) {
            updatePayload.platform = this.validatePlatform(payload.platform);
        }

        if (payload.latestVersionCode !== undefined) {
            updatePayload.latestVersionCode = Number(payload.latestVersionCode);
        }

        if (payload.latestVersionName !== undefined) {
            updatePayload.latestVersionName = String(payload.latestVersionName).trim();
        }

        if (payload.minimumVersionCode !== undefined) {
            updatePayload.minimumVersionCode = Number(payload.minimumVersionCode);
        }

        if (payload.forceUpdate !== undefined) {
            updatePayload.forceUpdate = Boolean(payload.forceUpdate);
        }

        if (payload.updateTitle !== undefined) {
            updatePayload.updateTitle = String(payload.updateTitle).trim();
        }

        if (payload.updateMessage !== undefined) {
            updatePayload.updateMessage = String(payload.updateMessage).trim();
        }

        if (payload.playStoreUrl !== undefined) {
            updatePayload.playStoreUrl = String(payload.playStoreUrl).trim();
        }

        if (payload.appStoreUrl !== undefined) {
            updatePayload.appStoreUrl = String(payload.appStoreUrl).trim();
        }

        if (payload.isActive !== undefined) {
            updatePayload.isActive = Boolean(payload.isActive);
        }

        const data = await this.repository.updateById(id, updatePayload);

        if (!data) {
            throw new Error("App version not found");
        }

        return data;
    }

    async deleteById(id: any) {
        if (!id) {
            throw new Error("App version id is required");
        }

        const data = await this.repository.deleteById(id);

        if (!data) {
            throw new Error("App version not found");
        }

        return data;
    }
}