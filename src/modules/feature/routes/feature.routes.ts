import { Router } from "express";
import { FeatureController } from "../controllers/feature.controller.js";
import { createFeatureSchema, updateFeatureSchema } from "../validations/feature.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const featureRoutes = Router();
const featureController = new FeatureController();

featureRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createFeatureSchema),
    featureController.createFeature
);

featureRoutes.get(
    "/getall",
    authMiddleware,
    featureController.getAllFeatures
);

featureRoutes.get(
    "/get/:id",
    authMiddleware,
    featureController.getFeatureById
);

featureRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateFeatureSchema),
    featureController.updateFeature
);

featureRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    featureController.deactivateFeature
);

featureRoutes.put(
    "/activate/:id",
    authMiddleware,
    featureController.activateFeature
);

export default featureRoutes;