import { Router } from "express";

import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

import { ProductCategoryController } from "../controllers/productcategory.controller.js";

import {
    createProductCategorySchema,
    updateProductCategorySchema,
} from "../validations/productcategory.validation.js";

const productCategoryRoutes = Router();

const controller =
    new ProductCategoryController();

/**
 * ============================================================
 * PROTECTED WRITE APIs
 * ============================================================
 */

productCategoryRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(
        createProductCategorySchema
    ),
    controller.create
);

/**
 * EXISTING FLOW PRESERVED.
 *
 * createbulk was already public.
 * We are intentionally not changing its behaviour in this
 * guest-browsing deployment.
 */
productCategoryRoutes.post(
    "/createbulk",
    controller.createBulk
);

/**
 * ============================================================
 * PUBLIC READ APIs
 * ============================================================
 */

productCategoryRoutes.get(
    "/getall",
    controller.getAll
);

productCategoryRoutes.get(
    "/getbyvendorcategory/:vendorCategoryId",
    controller.getByVendorCategory
);

productCategoryRoutes.get(
    "/get/:id",
    controller.getById
);

/**
 * ============================================================
 * PROTECTED MANAGEMENT APIs
 * ============================================================
 */

productCategoryRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(
        updateProductCategorySchema
    ),
    controller.update
);

productCategoryRoutes.put(
    "/activate/:id",
    authMiddleware,
    controller.activate
);

productCategoryRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    controller.deactivate
);

export default productCategoryRoutes;