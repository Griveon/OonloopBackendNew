import mongoose from "mongoose";
import type { CreateNotificationDTO } from "../interfaces/notification.interface.js";
import { UserModel } from "../../user/models/user.model.js";
import { FirebaseTokenService } from "./firebasetoken.service.js";
import { NotificationRepository } from "../repositories/notification.repository.js";

export class NotificationService {
    private notificationRepository: NotificationRepository;
    private firebaseTokenService: FirebaseTokenService;

    constructor() {
        this.notificationRepository = new NotificationRepository();
        this.firebaseTokenService = new FirebaseTokenService();
    }

    async createAndSendNotification(data: CreateNotificationDTO, createdBy?: string) {
        if (!data.title?.trim()) {
            throw new Error("Notification title is required");
        }

        if (!data.paragraph?.trim()) {
            throw new Error("Notification paragraph is required");
        }

        if (!data.targetType) {
            throw new Error("Notification target type is required");
        }

        if (!["all", "users", "role"].includes(data.targetType)) {
            throw new Error("Invalid notification target type");
        }

        if (data.targetType === "role") {
            if (!data.role?.trim()) {
                throw new Error("Role is required");
            }
        }

        let finalUserIds: string[] = [];

        /*
            ✅ If targetType = users and userIds are not sent from frontend,
            then we fetch all active users from UserModel automatically.
        */
        if (data.targetType === "users") {
            if (data.userIds && Array.isArray(data.userIds) && data.userIds.length > 0) {
                finalUserIds = data.userIds.map((id: any) => id.toString());
            } else {
                const users = await UserModel.find({
                    isDeleted: { $ne: true },
                    isActive: { $ne: false },
                })
                    .select("_id")
                    .lean();

                finalUserIds = users
                    .map((item: any) => item?._id?.toString?.())
                    .filter(Boolean);
            }

            if (finalUserIds.length === 0) {
                throw new Error("No active users found for notification");
            }

            data.userIds = finalUserIds as any;
        }

        /*
            ✅ If targetType = all, also fetch all active users and save them
            into notification payload.
        */
        if (data.targetType === "all") {
            const users = await UserModel.find({
                isDeleted: { $ne: true },
                isActive: { $ne: false },
            })
                .select("_id")
                .lean();

            finalUserIds = users
                .map((item: any) => item?._id?.toString?.())
                .filter(Boolean);

            if (finalUserIds.length === 0) {
                throw new Error("No active users found for notification");
            }

            data.userIds = finalUserIds as any;
        }

        if (data.targetType === "role") {
            const role = data.role?.trim();

            if (!role) {
                throw new Error("Role is required");
            }

            const users = await UserModel.find({
                role,
            } as any)
                .select("_id")
                .lean();

            finalUserIds = users
                .map((item: any) => item?._id?.toString?.())
                .filter(Boolean);

            if (finalUserIds.length === 0) {
                throw new Error(`No active users found for role: ${role}`);
            }

            data.role = role;
            data.userIds = finalUserIds as any;
        }

        const notification = await this.notificationRepository.createNotification(
            data,
            createdBy
        );

        try {
            const pushData = {
                notificationId: notification._id.toString(),
                type: "admin_notification",
                screen: "NotificationDetails",
                click_action: "FLUTTER_NOTIFICATION_CLICK",
                imageUrl: data.imageUrl || "",
                ...(data.data || {}),
            };

            let sendResult: any;

            if (data.targetType === "users") {
                sendResult = await this.firebaseTokenService.sendNotificationToUsers({
                    userIds: finalUserIds,
                    title: data.title,
                    body: data.paragraph,
                    data: pushData,
                });
            }

            if (data.targetType === "role") {
                sendResult = await this.firebaseTokenService.sendNotificationToUsers({
                    userIds: finalUserIds,
                    title: data.title,
                    body: data.paragraph,
                    data: pushData,
                });
            }

            if (data.targetType === "all") {
                sendResult = await this.firebaseTokenService.sendNotificationToUsers({
                    userIds: finalUserIds,
                    title: data.title,
                    body: data.paragraph,
                    data: pushData,
                });
            }

            const successCount =
                sendResult?.result?.successCount ||
                sendResult?.result?.responses?.filter((item: any) => item.success)
                    ?.length ||
                0;

            const failureCount =
                sendResult?.result?.failureCount ||
                sendResult?.result?.responses?.filter((item: any) => !item.success)
                    ?.length ||
                0;

            const updatedNotification =
                await this.notificationRepository.updateNotificationStatus(
                    notification._id.toString(),
                    {
                        status: sendResult?.success ? "sent" : "failed",
                        totalUsers: sendResult?.totalUsers || finalUserIds.length || 0,
                        totalTokens: sendResult?.totalTokens || 0,
                        successCount,
                        failureCount,
                        sentAt: new Date(),
                    }
                );

            return {
                success: sendResult?.success || false,
                message: sendResult?.message || "Notification processed",
                notification: updatedNotification,
                pushResult: sendResult,
            };
        } catch (error: any) {
            const updatedNotification =
                await this.notificationRepository.updateNotificationStatus(
                    notification._id.toString(),
                    {
                        status: "failed",
                        totalUsers: finalUserIds.length || 0,
                        sentAt: new Date(),
                    }
                );

            return {
                success: false,
                message: error?.message || "Notification failed",
                notification: updatedNotification,
                pushResult: null,
            };
        }
    }

    async getNotifications(query: {
        page?: string;
        limit?: string;
        status?: string;
        targetType?: string;
    }) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 10);

        const payload: {
            page: number;
            limit: number;
            status?: string;
            targetType?: string;
        } = {
            page,
            limit,
        };

        if (query.status) {
            payload.status = query.status;
        }

        if (query.targetType) {
            payload.targetType = query.targetType;
        }

        return await this.notificationRepository.getNotifications(payload);
    }

    async getNotificationById(notificationId: any) {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            throw new Error("Invalid notification ID");
        }

        const notification =
            await this.notificationRepository.getNotificationById(notificationId);

        if (!notification) {
            throw new Error("Notification not found");
        }

        return notification;
    }
}