import { Router } from "express";
import { FirebaseTokenController } from "../controllers/firebasetoken.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

const firebaseTokenRoutes = Router();

const controller = new FirebaseTokenController();

firebaseTokenRoutes.post(
    "/save",
    authMiddleware,
    controller.saveToken
);

firebaseTokenRoutes.get(
    "/my-tokens",
    authMiddleware,
    controller.getMyTokens
);

firebaseTokenRoutes.delete(
    "/remove",
    authMiddleware,
    controller.removeToken
);

firebaseTokenRoutes.put(
    "/deactivate",
    authMiddleware,
    controller.deactivateToken
);

firebaseTokenRoutes.put(
    "/logout-all-devices",
    authMiddleware,
    controller.logoutFromAllDevices
);

firebaseTokenRoutes.post(
    "/test",
    authMiddleware,
    controller.sendTestNotification
);

firebaseTokenRoutes.post(
    "/send-to-user",
    authMiddleware,
    controller.sendNotificationToUser
);

export default firebaseTokenRoutes;