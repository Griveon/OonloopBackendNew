import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { ManualDeliveryController } from "../controllers/manualdelivery.controller.js";
import {
    createManualDeliverySchema,
    updateManualDeliverySchema,
    assignDriverSchema,
    cancelDeliverySchema,
    calculateDistanceSchema,
} from "../validations/manualdelivery.validation.js";

const manualDeliveryRoutes = Router();
const controller = new ManualDeliveryController();

/**
 * Vendor & Admin endpoints
 */

// Get authenticated vendor's registered store pickup address snapshot
manualDeliveryRoutes.get(
    "/pickup-default",
    authMiddleware,
    controller.getDefaultPickup
);

// Preview distance calculation between vendor store (or given coords) and dropoff
manualDeliveryRoutes.post(
    "/calculate-distance",
    authMiddleware,
    validateUsingZOD(calculateDistanceSchema),
    controller.calculateDistance
);

import manualDeliveryDriverRoutes from "./manualdelivery-driver.routes.js";

// Driver subroutes (MUST be registered before dynamic "/:id" routes to avoid route shadowing)
manualDeliveryRoutes.use("/driver", manualDeliveryDriverRoutes);

// Create manual delivery
manualDeliveryRoutes.post(
    "/",
    authMiddleware,
    validateUsingZOD(createManualDeliverySchema),
    controller.create
);

// List accessible deliveries (vendor sees own, admin sees all, with filters)
manualDeliveryRoutes.get(
    "/",
    authMiddleware,
    controller.getAll
);

// Get single delivery details by ID
manualDeliveryRoutes.get(
    "/:id",
    authMiddleware,
    controller.getById
);

// Update eligible delivery fields (when CREATED)
manualDeliveryRoutes.patch(
    "/:id",
    authMiddleware,
    validateUsingZOD(updateManualDeliverySchema),
    controller.update
);

// Assign driver
manualDeliveryRoutes.post(
    "/:id/assign-driver",
    authMiddleware,
    validateUsingZOD(assignDriverSchema),
    controller.assignDriver
);

// Cancel delivery
manualDeliveryRoutes.post(
    "/:id/cancel",
    authMiddleware,
    validateUsingZOD(cancelDeliverySchema),
    controller.cancel
);


export default manualDeliveryRoutes;
