import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { ManualDeliveryDriverController } from "../controllers/manualdelivery-driver.controller.js";
import {
    driverStatusUpdateSchema,
    driverRejectSchema,
} from "../validations/manualdelivery.validation.js";

const manualDeliveryDriverRoutes = Router();
const controller = new ManualDeliveryDriverController();

/**
 * Driver endpoints
 */

// List deliveries assigned to the authenticated driver
manualDeliveryDriverRoutes.get(
    "/",
    authMiddleware,
    controller.getMyDeliveries
);

// Get single assigned delivery details by ID
manualDeliveryDriverRoutes.get(
    "/:id",
    authMiddleware,
    controller.getById
);

// Driver accepts assignment
manualDeliveryDriverRoutes.post(
    "/:id/accept",
    authMiddleware,
    controller.accept
);

// Driver rejects assignment (resets to CREATED for reassignment)
manualDeliveryDriverRoutes.post(
    "/:id/reject",
    authMiddleware,
    validateUsingZOD(driverRejectSchema),
    controller.reject
);

// Driver updates delivery milestone status (PICKED_UP, OUT_FOR_DELIVERY, REACHED, DELIVERED, FAILED)
manualDeliveryDriverRoutes.patch(
    "/:id/status",
    authMiddleware,
    validateUsingZOD(driverStatusUpdateSchema),
    controller.updateStatus
);

export default manualDeliveryDriverRoutes;
