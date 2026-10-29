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
 * Driver endpoints for Manual Deliveries
 *
 * Supported base mounts:
 * - /driver/manual-deliveries
 * - /manual-deliveries/driver
 * - /driverorders/manual-deliveries
 *
 * Static routes MUST be declared before parameter routes (/:id)
 * to avoid route shadowing.
 */

// 1. Available deliveries to take (pool of unassigned deliveries in CREATED status)
manualDeliveryDriverRoutes.get(
    "/available",
    authMiddleware,
    controller.getAvailableDeliveries
);
manualDeliveryDriverRoutes.get(
    "/available-orders",
    authMiddleware,
    controller.getAvailableDeliveries
);

// 2. Active / Assigned deliveries for the authenticated driver
manualDeliveryDriverRoutes.get(
    "/",
    authMiddleware,
    controller.getMyDeliveries
);
manualDeliveryDriverRoutes.get(
    "/orders",
    authMiddleware,
    controller.getMyDeliveries
);
manualDeliveryDriverRoutes.get(
    "/my-deliveries",
    authMiddleware,
    controller.getMyDeliveries
);

// 3. Past completed / terminal delivery history
manualDeliveryDriverRoutes.get(
    "/history",
    authMiddleware,
    controller.getHistory
);

// 4. Performance stats for the authenticated driver
manualDeliveryDriverRoutes.get(
    "/stats",
    authMiddleware,
    controller.getStats
);

// 5. Driver takes an available delivery (prefix-style aliases matching vendor orders)
manualDeliveryDriverRoutes.put(
    "/take-order/:orderId",
    authMiddleware,
    controller.takeOrder
);
manualDeliveryDriverRoutes.post(
    "/take-order/:orderId",
    authMiddleware,
    controller.takeOrder
);
manualDeliveryDriverRoutes.put(
    "/takeorder/:orderId",
    authMiddleware,
    controller.takeOrder
);
manualDeliveryDriverRoutes.post(
    "/takeorder/:orderId",
    authMiddleware,
    controller.takeOrder
);

// 6. Driver updates delivery status (prefix-style alias matching vendor orders)
manualDeliveryDriverRoutes.put(
    "/update-delivery-status/:orderId",
    authMiddleware,
    validateUsingZOD(driverStatusUpdateSchema),
    controller.updateStatus
);
manualDeliveryDriverRoutes.put(
    "/updatedeliverystatus/:orderId",
    authMiddleware,
    validateUsingZOD(driverStatusUpdateSchema),
    controller.updateStatus
);

// 7. Parameterized routes by delivery ID
// Driver takes an available delivery (postfix-style)
manualDeliveryDriverRoutes.post(
    "/:id/take",
    authMiddleware,
    controller.takeOrder
);
manualDeliveryDriverRoutes.put(
    "/:id/take",
    authMiddleware,
    controller.takeOrder
);
manualDeliveryDriverRoutes.post(
    "/:id/take-order",
    authMiddleware,
    controller.takeOrder
);
manualDeliveryDriverRoutes.put(
    "/:id/take-order",
    authMiddleware,
    controller.takeOrder
);

// Driver accepts assignment
manualDeliveryDriverRoutes.post(
    "/:id/accept",
    authMiddleware,
    controller.accept
);
manualDeliveryDriverRoutes.put(
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
manualDeliveryDriverRoutes.put(
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
manualDeliveryDriverRoutes.put(
    "/:id/status",
    authMiddleware,
    validateUsingZOD(driverStatusUpdateSchema),
    controller.updateStatus
);
manualDeliveryDriverRoutes.put(
    "/:id/update-delivery-status",
    authMiddleware,
    validateUsingZOD(driverStatusUpdateSchema),
    controller.updateStatus
);

// Get single delivery details (accessible for assigned driver OR available orders for any active driver)
manualDeliveryDriverRoutes.get(
    "/:id",
    authMiddleware,
    controller.getById
);
manualDeliveryDriverRoutes.get(
    "/details/:id",
    authMiddleware,
    controller.getById
);

export default manualDeliveryDriverRoutes;
