import { Router } from "express";
import { PlanController } from "../controllers/plan.controller.js";
import { createPlanSchema, updatePlanSchema } from "../validations/plan.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const planRoutes = Router();
const planController = new PlanController();

planRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createPlanSchema),
    planController.createPlan
);

planRoutes.get(
    "/getall",
    authMiddleware,
    planController.getAllPlans
);

planRoutes.get(
    "/getall/q",
    authMiddleware,
    planController.getAllPlansWithQuery
);

planRoutes.get(
    "/get/:id",
    authMiddleware,
    planController.getPlanById
);

planRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updatePlanSchema),
    planController.updatePlan
);

planRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    planController.deactivatePlan
);

planRoutes.put(
    "/activate/:id",
    authMiddleware,
    planController.activatePlan
);

planRoutes.get("/with-features", authMiddleware, planController.getAllPlansWithFeatures);

export default planRoutes;