import { AppVersionRepository } from "../repositories/appversion.repository.js";
import { AppPlatform } from "../constants/appversion.constant.js";
import type {
    IAppVersion,
    IAppVersionCheckQuery,
    IAppVersionCheckResponse,
    IAppVersionDocument,
} from "../interfaces/appversion.interface.js";
import { AppError } from "../../../utils/appError.js";

export class AppVersionService {
    private repository: AppVersionRepository;

    constructor() {
        this.repository = new AppVersionRepository();
    }

    /**
     * Check if an app update is available or required for the client platform & build.
     * Uses build number as the primary comparison.
     */
    async checkVersion(query: IAppVersionCheckQuery): Promise<IAppVersionCheckResponse> {
        const { platform, buildNumber: currentBuild } = query;

        const config = await this.repository.findActiveByPlatform(platform);

        if (!config) {
            return {
                updateAvailable: false,
                forceUpdate: false,
                latestVersion: query.version || "1.0.0",
                latestBuildNumber: currentBuild,
                message: "App is running the latest available version.",
            };
        }

        const latestBuild = config.latestBuildNumber;
        const minimumSupportedBuild = config.minimumSupportedBuildNumber;

        // Primary comparison: current build vs latest build
        const updateAvailable = currentBuild < latestBuild;
        let forceUpdate = false;

        if (updateAvailable) {
            // Force update if below minimum supported build OR if stored forceUpdate flag is true
            if (currentBuild < minimumSupportedBuild || Boolean(config.forceUpdate)) {
                forceUpdate = true;
            }
        }

        // Return only frontend-required data
        const response: IAppVersionCheckResponse = {
            updateAvailable,
            forceUpdate,
            latestVersion: config.latestVersion,
            latestBuildNumber: config.latestBuildNumber,
        };

        if (config.storeUrl) {
            response.storeUrl = config.storeUrl;
        }

        if (config.message) {
            response.message = config.message;
        }

        if (config.maintenanceMode) {
            response.maintenanceMode = config.maintenanceMode;
        }

        return response;
    }

    /**
     * Admin: Create or update version configuration for a specific platform.
     */
    async upsertPlatformConfig(
        platform: AppPlatform,
        payload: Partial<IAppVersion>
    ): Promise<IAppVersionDocument> {
        if (!Object.values(AppPlatform).includes(platform)) {
            throw new AppError(
                `Invalid platform: "${platform}". Supported platforms are: ${Object.values(AppPlatform).join(", ")}`,
                400
            );
        }

        if (
            payload.minimumSupportedBuildNumber !== undefined &&
            payload.latestBuildNumber !== undefined &&
            payload.minimumSupportedBuildNumber > payload.latestBuildNumber
        ) {
            throw new AppError(
                "minimumSupportedBuildNumber cannot be greater than latestBuildNumber",
                400
            );
        }

        return await this.repository.upsertByPlatform(platform, payload);
    }

    /**
     * Admin: Get configuration for a specific platform.
     */
    async getConfigByPlatform(platform: AppPlatform): Promise<IAppVersionDocument> {
        const config = await this.repository.findByPlatform(platform);
        if (!config) {
            throw new AppError(`No version configuration found for platform "${platform}"`, 404);
        }
        return config;
    }

    /**
     * Admin: Get all platform configurations.
     */
    async getAllConfigs(): Promise<IAppVersionDocument[]> {
        return await this.repository.findAll();
    }

    /**
     * Admin: Delete configuration for a specific platform.
     */
    async deleteConfigByPlatform(platform: AppPlatform): Promise<IAppVersionDocument> {
        const deleted = await this.repository.deleteByPlatform(platform);
        if (!deleted) {
            throw new AppError(`No version configuration found for platform "${platform}"`, 404);
        }
        return deleted;
    }
}