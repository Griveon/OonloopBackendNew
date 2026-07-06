import { AppVersionModel } from "../models/appversion.model.js";
import type { AppPlatform } from "../interfaces/appversion.interface.js";

export class AppVersionRepository {
    async createOrUpdate(platform: AppPlatform, payload: any) {
        return await AppVersionModel.findOneAndUpdate(
            { platform },
            {
                $set: {
                    platform,
                    latestVersionCode: payload.latestVersionCode,
                    latestVersionName: payload.latestVersionName,
                    minimumVersionCode: payload.minimumVersionCode,
                    forceUpdate: payload.forceUpdate,
                    updateTitle: payload.updateTitle,
                    updateMessage: payload.updateMessage,
                    playStoreUrl: payload.playStoreUrl,
                    appStoreUrl: payload.appStoreUrl,
                    isActive: payload.isActive,
                },
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );
    }

    async findByPlatform(platform: AppPlatform) {
        return await AppVersionModel.findOne({
            platform,
            isActive: true,
        });
    }

    async getAll() {
        return await AppVersionModel.find()
            .sort({ createdAt: -1 });
    }

    async getById(id: string) {
        return await AppVersionModel.findById(id);
    }

    async updateById(id: string, payload: any) {
        return await AppVersionModel.findByIdAndUpdate(
            id,
            {
                $set: payload,
            },
            {
                new: true,
                runValidators: true,
            }
        );
    }

    async deleteById(id: string) {
        return await AppVersionModel.findByIdAndDelete(id);
    }
}