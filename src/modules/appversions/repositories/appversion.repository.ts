import { AppVersionModel } from "../models/appversion.model.js";
import type { IAppVersion, IAppVersionDocument } from "../interfaces/appversion.interface.js";
import { AppPlatform } from "../constants/appversion.constant.js";

export class AppVersionRepository {
    /**
     * Find active configuration for a platform (used by public check API)
     */
    async findActiveByPlatform(platform: AppPlatform): Promise<IAppVersionDocument | null> {
        return await AppVersionModel.findOne({
            platform,
            isActive: true,
        }).lean<IAppVersionDocument>();
    }

    /**
     * Find configuration for a platform (used by admin API)
     */
    async findByPlatform(platform: AppPlatform): Promise<IAppVersionDocument | null> {
        return await AppVersionModel.findOne({ platform });
    }

    /**
     * Upsert configuration for a platform.
     * Enforces single active configuration per platform.
     */
    async upsertByPlatform(
        platform: AppPlatform,
        payload: Partial<IAppVersion>
    ): Promise<IAppVersionDocument> {
        const isActive = payload.isActive !== false;

        // If activating, deactivate other existing active records for this platform if any
        if (isActive) {
            await AppVersionModel.updateMany(
                { platform, isActive: true },
                { $set: { isActive: false } }
            );
        }

        const updated = await AppVersionModel.findOneAndUpdate(
            { platform },
            {
                $set: {
                    ...payload,
                    platform,
                    isActive,
                },
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        return updated;
    }

    /**
     * Get all platform configurations (for admin dashboard)
     */
    async findAll(): Promise<IAppVersionDocument[]> {
        return await AppVersionModel.find().sort({ platform: 1, createdAt: -1 });
    }

    /**
     * Get configuration by ID
     */
    async findById(id: string): Promise<IAppVersionDocument | null> {
        return await AppVersionModel.findById(id);
    }

    /**
     * Delete configuration by platform
     */
    async deleteByPlatform(platform: AppPlatform): Promise<IAppVersionDocument | null> {
        return await AppVersionModel.findOneAndDelete({ platform });
    }
}