import type { Request, Response } from "express";
import { NotificationService } from "../services/notification.service.js";

export class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    private getLoggedInUserId(req: Request) {
        const user: any = (req as any).user;

        return user?._id || user?.id || user?.userId;
    }

    createAndSendNotification = async (req: Request, res: Response) => {
        try {
            const createdBy = this.getLoggedInUserId(req);

            const result =
                await this.notificationService.createAndSendNotification(
                    req.body,
                    createdBy
                );

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error?.message || "Failed to send notification",
            });
        }
    };

    getNotifications = async (req: Request, res: Response) => {
        try {
            const result = await this.notificationService.getNotifications(
                req.query as any
            );

            return res.status(200).json({
                success: true,
                message: "Notifications fetched successfully",
                data: result,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error?.message || "Failed to fetch notifications",
            });
        }
    };

    getNotificationById = async (req: Request, res: Response) => {
        try {
            const result = await this.notificationService.getNotificationById(
                req.params.id
            );

            return res.status(200).json({
                success: true,
                message: "Notification fetched successfully",
                data: result,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error?.message || "Failed to fetch notification",
            });
        }
    };
}