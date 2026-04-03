import { Router } from "express";
import { PlanFeatureController } from "../controllers/planfeature.controller.js";
import { createPlanFeatureSchema, updatePlanFeatureSchema } from "../validations/planfeature.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const planFeatureRoutes = Router();
const controller = new PlanFeatureController();

planFeatureRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createPlanFeatureSchema),
    controller.createPlanFeature
);

planFeatureRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getPlanFeatureById
);

planFeatureRoutes.get(
    "/getall/:planId",
    authMiddleware,
    controller.getAllFeaturesByPlan
);

planFeatureRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updatePlanFeatureSchema),
    controller.updatePlanFeature
);

planFeatureRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.deletePlanFeature
);


planFeatureRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    controller.deactivatePlanFeature
);

planFeatureRoutes.put(
    "/activate/:id",
    authMiddleware,
    controller.activatePlanFeature
);

export default planFeatureRoutes;