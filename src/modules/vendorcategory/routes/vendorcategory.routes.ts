import { Router } from "express";
import { VendorCategoryController } from "../controllers/vendorcategory.controller.js";
import {
    createVendorCategorySchema,
    updateVendorCategorySchema,
} from "../validations/vendorcategory.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const vendorCategoryRoutes = Router();
const controller = new VendorCategoryController();

vendorCategoryRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createVendorCategorySchema),
    controller.create
);

vendorCategoryRoutes.get("/getall", authMiddleware, controller.getAll);

vendorCategoryRoutes.get("/get/:id", authMiddleware, controller.getById);

vendorCategoryRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateVendorCategorySchema),
    controller.update
);

vendorCategoryRoutes.put("/activate/:id", authMiddleware, controller.activate);

vendorCategoryRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);

export default vendorCategoryRoutes;