import { Router } from "express";
import { ProductVariantController } from "../controllers/productvariant.controller.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { createVariantSchema, updateVariantSchema } from "../validations/productvariant.validation.js";

const productVariantRoutes = Router();
const controller = new ProductVariantController();

productVariantRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createVariantSchema),
    controller.create
);

productVariantRoutes.get("/getall", authMiddleware, controller.getAll);
productVariantRoutes.get("/get/:id", authMiddleware, controller.getById);

productVariantRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateVariantSchema),
    controller.update
);

productVariantRoutes.put("/activate/:id", authMiddleware, controller.activate);
productVariantRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);

export default productVariantRoutes;