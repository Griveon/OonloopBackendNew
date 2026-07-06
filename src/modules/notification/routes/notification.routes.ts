import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { NotificationController } from "../controllers/notification.controller.js";

const notificationRoutes = Router();

const controller = new NotificationController();

notificationRoutes.post(
    "/send",
    authMiddleware,
    controller.createAndSendNotification
);

notificationRoutes.get(
    "/get",
    authMiddleware,
    controller.getNotifications
);

notificationRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getNotificationById
);

export default notificationRoutes;