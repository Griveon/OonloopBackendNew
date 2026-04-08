import { Router } from "express";
import { VendorSubscriptionController } from "../controllers/vendorsubscription.controller.js";
import {
    createVendorSubscriptionSchema,
    updateVendorSubscriptionSchema,
} from "../validations/vendorsubscription.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const vendorSubscriptionRoutes = Router();
const controller = new VendorSubscriptionController();

// ✅ Create
vendorSubscriptionRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createVendorSubscriptionSchema),
    controller.create
);

// ✅ Get by ID
vendorSubscriptionRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getById
);

vendorSubscriptionRoutes.get(
    "/getbyuser/:id",
    authMiddleware,
    controller.getSubscriptionByUser
);

vendorSubscriptionRoutes.get(
    "/get-active-subscription/:id",
    authMiddleware,
    controller.getActiveByUser
);

// ✅ Get all
vendorSubscriptionRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAll
);

// ✅ Update
vendorSubscriptionRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateVendorSubscriptionSchema),
    controller.update
);

// ✅ Delete (soft delete)
vendorSubscriptionRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.delete
);

// ✅ Deactivate
vendorSubscriptionRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    controller.deactivate
);

// ✅ Activate
vendorSubscriptionRoutes.put(
    "/activate/:id",
    authMiddleware,
    controller.activate
);

export default vendorSubscriptionRoutes;