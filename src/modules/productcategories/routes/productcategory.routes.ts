import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { ProductCategoryController } from "../controllers/productcategory.controller.js";
import { createProductCategorySchema, updateProductCategorySchema } from "../validations/productcategory.validation.js";

const productCategoryRoutes = Router();
const controller = new ProductCategoryController();

productCategoryRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createProductCategorySchema),
    controller.create
);

productCategoryRoutes.post(
    "/createbulk",
    controller.createBulk
);

productCategoryRoutes.get("/getall", controller.getAll);

productCategoryRoutes.get("/getbyvendorcategory/:vendorCategoryId", controller.getByVendorCategory);

productCategoryRoutes.get("/get/:id", authMiddleware, controller.getById);

productCategoryRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateProductCategorySchema),
    controller.update
);

productCategoryRoutes.put("/activate/:id", authMiddleware, controller.activate);

productCategoryRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);

export default productCategoryRoutes;