import { getMessaging } from "firebase-admin/messaging";

import type {
    SaveFirebaseTokenDTO,
    SendPushNotificationDTO,
} from "../interfaces/firebasetoken.interface.js";

import { FirebaseTokenRepository } from "../repositories/firebasetoken.repository.js";

import {
    sendFirebaseNotificationToMultipleTokens,
    sendFirebaseNotificationToToken,
} from "../utils/firebasepush.util.js";

import { UserModel } from "../../user/models/user.model.js";

export class FirebaseTokenService {
    private firebaseTokenRepository: FirebaseTokenRepository;

    constructor() {
        this.firebaseTokenRepository = new FirebaseTokenRepository();
    }

    async saveToken(userId: string, data: SaveFirebaseTokenDTO) {
        if (!data.token) {
            throw new Error("Firebase token is required");
        }

        if (!data.platform) {
            throw new Error("Platform is required");
        }

        if (!["android", "ios", "web"].includes(data.platform)) {
            throw new Error("Invalid platform");
        }

        const tokenDoc =
            await this.firebaseTokenRepository.saveOrUpdateToken(
                userId,
                data
            );

        return tokenDoc;
    }

    async getMyTokens(userId: string) {
        const tokens =
            await this.firebaseTokenRepository.findAllTokensByUserId(
                userId
            );

        return {
            total: tokens.length,
            active: tokens.filter(item => item.isActive).length,
            tokens,
        };
    }

    async removeToken(userId: string, token: string) {
        if (!token) {
            throw new Error("Firebase token is required");
        }

        return await this.firebaseTokenRepository.deleteToken(
            userId,
            token
        );
    }

    async deactivateToken(userId: string, token: string) {
        if (!token) {
            throw new Error("Firebase token is required");
        }

        return await this.firebaseTokenRepository.deactivateToken(
            userId,
            token
        );
    }

    async deactivateAllUserTokens(userId: string) {
        return await this.firebaseTokenRepository.deactivateAllUserTokens(
            userId
        );
    }

    async sendNotificationToUser(data: SendPushNotificationDTO) {
        if (!data.userId) {
            throw new Error("User ID is required");
        }

        if (!data.title) {
            throw new Error("Notification title is required");
        }

        if (!data.body) {
            throw new Error("Notification body is required");
        }

        const tokenDocs =
            await this.firebaseTokenRepository.findActiveTokensByUserId(
                data.userId
            );

        const tokens = [
            ...new Set(
                tokenDocs
                    .map(item => item.token)
                    .filter(Boolean)
            ),
        ];

        if (!tokens.length) {
            return {
                success: false,
                message: "No active Firebase token found for this user",
                result: null,
            };
        }

        const result =
            await sendFirebaseNotificationToMultipleTokens({
                tokens,
                title: data.title,
                body: data.body,
                data: this.sanitizeNotificationData(data.data || {}),
            });

        return {
            success: true,
            message: "Notification sent successfully",
            totalUsers: 1,
            totalTokens: tokens.length,
            result,
        };
    }

    async sendNotificationToUsers({
        userIds,
        title,
        body,
        data = {},
    }: {
        userIds: string[];
        title: string;
        body: string;
        data?: Record<string, any>;
    }) {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            throw new Error("User IDs are required");
        }

        if (!title) {
            throw new Error("Notification title is required");
        }

        if (!body) {
            throw new Error("Notification body is required");
        }

        const uniqueUserIds = [
            ...new Set(
                userIds
                    .map(item => item?.toString?.())
                    .filter(Boolean)
            ),
        ];

        const allTokens: string[] = [];

        for (const userId of uniqueUserIds) {
            const tokenDocs =
                await this.firebaseTokenRepository.findActiveTokensByUserId(
                    userId
                );

            const userTokens = tokenDocs
                .map(item => item.token)
                .filter(Boolean);

            allTokens.push(...userTokens);
        }

        const uniqueTokens = [
            ...new Set(
                allTokens
                    .map(item => item?.toString?.())
                    .filter(Boolean)
            ),
        ];

        if (!uniqueTokens.length) {
            return {
                success: false,
                message: "No active Firebase tokens found for these users",
                totalUsers: uniqueUserIds.length,
                totalTokens: 0,
                result: null,
            };
        }

        const result =
            await sendFirebaseNotificationToMultipleTokens({
                tokens: uniqueTokens,
                title,
                body,
                data: this.sanitizeNotificationData(data),
            });

        return {
            success: true,
            message: "Notifications sent successfully",
            totalUsers: uniqueUserIds.length,
            totalTokens: uniqueTokens.length,
            result,
        };
    }

    async sendNotificationToRole({
        role,
        title,
        body,
        data = {},
    }: {
        role: string;
        title: any;
        body: string;
        data?: Record<string, any>;
    }) {
        if (!role) {
            throw new Error("Role is required");
        }

        if (!title) {
            throw new Error("Notification title is required");
        }

        if (!body) {
            throw new Error("Notification body is required");
        }

        const users = await this.findActiveUsersByRole(role);

        const userIds = users
            .map((item: any) => item?._id?.toString?.())
            .filter(Boolean);

        if (!userIds.length) {
            return {
                success: false,
                message: `No active users found for role: ${role}`,
                totalUsers: 0,
                totalTokens: 0,
                result: null,
            };
        }

        return await this.sendNotificationToUsers({
            userIds,
            title,
            body,
            data,
        });
    }

    /**
     * Sends a DATA-ONLY high-priority push.
     *
     * Use this for driver paid-order alerts so the Driver app can display
     * the notification with Notifee and its custom Android channel sound.
     */
    async sendDataNotificationToRole({
        role,
        title,
        body,
        data = {},
    }: {
        role: string;
        title: string;
        body: string;
        data?: Record<string, any>;
    }) {
        if (!role) {
            throw new Error("Role is required");
        }

        if (!title) {
            throw new Error("Notification title is required");
        }

        if (!body) {
            throw new Error("Notification body is required");
        }

        const users = await this.findActiveUsersByRole(role);

        const userIds = users
            .map((item: any) => item?._id?.toString?.())
            .filter(Boolean);

        if (!userIds.length) {
            return {
                success: false,
                message: `No active users found for role: ${role}`,
                totalUsers: 0,
                totalTokens: 0,
                result: null,
            };
        }

        const allTokens: string[] = [];

        for (const userId of userIds) {
            const tokenDocs =
                await this.firebaseTokenRepository.findActiveTokensByUserId(
                    userId
                );

            allTokens.push(
                ...tokenDocs
                    .map(item => item.token)
                    .filter(Boolean)
            );
        }

        const uniqueTokens = [
            ...new Set(
                allTokens
                    .map(token => token?.toString?.())
                    .filter(Boolean)
            ),
        ];

        if (!uniqueTokens.length) {
            return {
                success: false,
                message: `No active Firebase tokens found for role: ${role}`,
                totalUsers: userIds.length,
                totalTokens: 0,
                result: null,
            };
        }

        const notificationData = this.sanitizeNotificationData({
            ...data,
            title,
            body,
        });

        const batchSize = 500;

        let successCount = 0;
        let failureCount = 0;
        const responses: any[] = [];

        for (
            let index = 0;
            index < uniqueTokens.length;
            index += batchSize
        ) {
            const tokens = uniqueTokens.slice(
                index,
                index + batchSize
            );

            const result = await getMessaging().sendEachForMulticast({
                tokens,
                data: notificationData,
                android: {
                    priority: "high",
                },
                apns: {
                    headers: {
                        "apns-priority": "5",
                    },
                    payload: {
                        aps: {
                            contentAvailable: true,
                        },
                    },
                },
            });

            successCount += result.successCount;
            failureCount += result.failureCount;
            responses.push(result);
        }

        return {
            success: successCount > 0,
            message: "Data notification processing completed",
            totalUsers: userIds.length,
            totalTokens: uniqueTokens.length,
            successCount,
            failureCount,
            result: responses,
        };
    }

    async sendNotificationToToken({
        token,
        title,
        body,
        data = {},
    }: {
        token: string;
        title: string;
        body: string;
        data?: Record<string, any>;
    }) {
        if (!token) {
            throw new Error("Firebase token is required");
        }

        if (!title) {
            throw new Error("Notification title is required");
        }

        if (!body) {
            throw new Error("Notification body is required");
        }

        const result = await sendFirebaseNotificationToToken({
            token,
            title,
            body,
            data: this.sanitizeNotificationData(data),
        });

        return result;
    }

    private async findActiveUsersByRole(role: string) {
        return await UserModel.find({
            $or: [
                { role },
                { roles: role },
                { userRole: role },
            ],
            isDeleted: { $ne: true },
            isActive: { $ne: false },
        } as any)
            .select("_id")
            .lean();
    }

    private sanitizeNotificationData(data: Record<string, any>) {
        const sanitizedData: Record<string, string> = {};

        Object.entries(data || {}).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                sanitizedData[key] = "";
                return;
            }

            sanitizedData[key] = value.toString();
        });

        return sanitizedData;
    }
}
