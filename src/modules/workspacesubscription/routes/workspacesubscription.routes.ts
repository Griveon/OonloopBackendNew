import { Router } from "express";
import { WorkspaceSubscriptionController } from "../controllers/workspacesubscription.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { createWorkspaceSubscriptionSchema } from "../validations/workspacesubscription.validation.js";
import { z } from "zod";

const workspaceSubscriptionRoutes = Router();
const controller = new WorkspaceSubscriptionController();

const changePlanSchema = z.object({
    plan: z.string().length(24, "Invalid plan ID"),
});


workspaceSubscriptionRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createWorkspaceSubscriptionSchema),
    controller.createSubscription
);


workspaceSubscriptionRoutes.get(
    "/active/:id",
    authMiddleware,
    controller.getActiveSubscription
);


workspaceSubscriptionRoutes.put(
    "/change-plan/:id",
    authMiddleware,
    validateUsingZOD(changePlanSchema),
    controller.changePlan
);


workspaceSubscriptionRoutes.put(
    "/cancel/:id",
    authMiddleware,
    controller.cancelSubscription
);


workspaceSubscriptionRoutes.put(
    "/activate/:id",
    authMiddleware,
    controller.activateSubscription
);


workspaceSubscriptionRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getSubscriptionById
);


workspaceSubscriptionRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAllSubscriptions
);


workspaceSubscriptionRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.deleteSubscription
);

export default workspaceSubscriptionRoutes;