import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { PreorderController } from "../controllers/preorder.controller.js";
import {
    upsertConfigSchema,
    createOrderSchema,
} from "../validations/preorder.validation.js";

const preorderRoutes = Router();
const controller = new PreorderController();

// ---------------- Customer: listing (public) ----------------
preorderRoutes.get("/products", controller.listProducts);

// ---------------- Seller: config ----------------
preorderRoutes.get("/config/mine", authMiddleware, controller.getMyConfigs);
preorderRoutes.post(
    "/config/:productId",
    authMiddleware,
    validateUsingZOD(upsertConfigSchema),
    controller.upsertConfig
);
preorderRoutes.put(
    "/config/:productId/active",
    authMiddleware,
    controller.setConfigActive
);

// ---------------- Seller: incoming orders ----------------
preorderRoutes.get(
    "/vendor/orders",
    authMiddleware,
    controller.getVendorOrders
);
preorderRoutes.put(
    "/vendor/orders/:id/status",
    authMiddleware,
    controller.updateStatus
);

// ---------------- Customer: orders ----------------
preorderRoutes.post(
    "/order",
    authMiddleware,
    validateUsingZOD(createOrderSchema),
    controller.createOrder
);
preorderRoutes.get("/my", authMiddleware, controller.getMyOrders);
preorderRoutes.get("/get/:id", authMiddleware, controller.getById);
preorderRoutes.put("/cancel/:id", authMiddleware, controller.cancel);

export default preorderRoutes;
