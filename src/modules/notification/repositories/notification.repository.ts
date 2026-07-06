import mongoose from "mongoose";
import { NotificationModel } from "../models/notification.model.js";
import type {
    CreateNotificationDTO,
    NotificationStatus,
} from "../interfaces/notification.interface.js";

export class NotificationRepository {
    async createNotification(data: CreateNotificationDTO, createdBy?: string) {
        const payload: any = {
            title: data.title,
            paragraph: data.paragraph,
            targetType: data.targetType,
            imageUrl: data.imageUrl || "",
            data: data.data || {},
            status: "draft",
        };

        if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
            payload.createdBy = createdBy;
        }

        if (data.targetType === "users" && data.userIds?.length) {
            payload.userIds = data.userIds
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));
        }

        if (data.targetType === "role" && data.role) {
            payload.role = data.role;
        }

        return await NotificationModel.create(payload);
    }

    async updateNotificationStatus(
        notificationId: string,
        data: {
            status: NotificationStatus;
            totalUsers?: number;
            totalTokens?: number;
            successCount?: number;
            failureCount?: number;
            sentAt?: Date;
        }
    ) {
        const updatePayload: any = {
            status: data.status,
        };

        if (typeof data.totalUsers === "number") {
            updatePayload.totalUsers = data.totalUsers;
        }

        if (typeof data.totalTokens === "number") {
            updatePayload.totalTokens = data.totalTokens;
        }

        if (typeof data.successCount === "number") {
            updatePayload.successCount = data.successCount;
        }

        if (typeof data.failureCount === "number") {
            updatePayload.failureCount = data.failureCount;
        }

        if (data.sentAt) {
            updatePayload.sentAt = data.sentAt;
        }

        return await NotificationModel.findByIdAndUpdate(
            notificationId,
            updatePayload,
            { new: true }
        );
    }

    async getNotifications({
        page,
        limit,
        status,
        targetType,
    }: {
        page: number;
        limit: number;
        status?: string;
        targetType?: string;
    }) {
        const query: any = {};

        if (status) {
            query.status = status;
        }

        if (targetType) {
            query.targetType = targetType;
        }

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            NotificationModel.find(query)
                .populate("createdBy", "firstName lastName email mobileNumber")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            NotificationModel.countDocuments(query),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getNotificationById(notificationId: string) {
        return await NotificationModel.findById(notificationId)
            .populate("createdBy", "firstName lastName email mobileNumber")
            .populate("userIds", "firstName lastName email mobileNumber")
            .lean();
    }
}