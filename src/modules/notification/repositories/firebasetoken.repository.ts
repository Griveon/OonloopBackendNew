import { FirebaseTokenModel } from "../models/firebasetoken.model.js";
import type { SaveFirebaseTokenDTO } from "../interfaces/firebasetoken.interface.js";

export class FirebaseTokenRepository {
    async saveOrUpdateToken(userId: string, data: SaveFirebaseTokenDTO) {
        const tokenDoc = await FirebaseTokenModel.findOneAndUpdate(
            {
                token: data.token,
            },
            {
                $set: {
                    user: userId,
                    token: data.token,
                    platform: data.platform,
                    deviceId: data.deviceId || "",
                    deviceName: data.deviceName || "",
                    appVersion: data.appVersion || "",
                    isActive: true,
                    lastUsedAt: new Date(),
                },
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );

        return tokenDoc;
    }

    async findActiveTokensByUserId(userId: string) {
        return await FirebaseTokenModel.find({
            user: userId,
            isActive: true,
        }).sort({ updatedAt: -1 });
    }

    async findAllTokensByUserId(userId: string) {
        return await FirebaseTokenModel.find({
            user: userId,
        }).sort({ updatedAt: -1 });
    }

    async deactivateToken(userId: string, token: string) {
        const tokenDoc = await FirebaseTokenModel.findOneAndUpdate(
            {
                user: userId,
                token,
            },
            {
                $set: {
                    isActive: false,
                },
            },
            {
                new: true,
            }
        );

        if (!tokenDoc) {
            throw new Error("Firebase token not found");
        }

        return tokenDoc;
    }

    async deleteToken(userId: string, token: string) {
        const tokenDoc = await FirebaseTokenModel.findOneAndDelete({
            user: userId,
            token,
        });

        if (!tokenDoc) {
            throw new Error("Firebase token not found");
        }

        return tokenDoc;
    }

    async deleteTokensByDeviceId(userId: string, deviceId: string) {
        return await FirebaseTokenModel.deleteMany({
            user: userId,
            deviceId,
        });
    }

    async deactivateAllUserTokens(userId: string) {
        return await FirebaseTokenModel.updateMany(
            {
                user: userId,
            },
            {
                $set: {
                    isActive: false,
                },
            }
        );
    }
}