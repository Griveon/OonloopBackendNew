import { Router } from "express";
import { ProviderConnectionController } from "../controllers/providerconnection.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { createProviderConnectionSchema, updateProviderConnectionSchema } from "../validations/providerconnection.provider.js";

const providerConnectionRoutes = Router();
const providerController = new ProviderConnectionController();

providerConnectionRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createProviderConnectionSchema),
    providerController.create
);

providerConnectionRoutes.get(
    "/getall",
    authMiddleware,
    providerController.getAll
);

providerConnectionRoutes.get(
    "/get/:id",
    authMiddleware,
    providerController.getById
);

providerConnectionRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateProviderConnectionSchema),
    providerController.update
);

providerConnectionRoutes.delete(
    "/delete/:id",
    authMiddleware,
    providerController.delete
);

providerConnectionRoutes.put(
    "/activate/:id",
    authMiddleware,
    providerController.activate
);

providerConnectionRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    providerController.deactivate
);

export default providerConnectionRoutes;