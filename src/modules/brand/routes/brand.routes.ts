import { Router } from "express";
import { BrandController } from "../controllers/brand.controller.js";
import {
    createBrandSchema,
    updateBrandSchema,
} from "../validations/brand.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const brandRoutes = Router();
const controller = new BrandController();

brandRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createBrandSchema),
    controller.create
);

brandRoutes.get("/getall", authMiddleware, controller.getAll);

brandRoutes.get("/get/:id", authMiddleware, controller.getById);

brandRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateBrandSchema),
    controller.update
);

brandRoutes.put("/activate/:id", authMiddleware, controller.activate);
brandRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);

export default brandRoutes;