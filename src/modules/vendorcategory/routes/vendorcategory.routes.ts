import { Router } from "express";

import { VendorCategoryController } from "../controllers/vendorcategory.controller.js";

import {
    createVendorCategorySchema,
    updateVendorCategorySchema,
} from "../validations/vendorcategory.validation.js";

import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const vendorCategoryRoutes = Router();

const controller =
    new VendorCategoryController();

/**
 * ============================================================
 * PROTECTED WRITE APIs
 * ============================================================
 */

vendorCategoryRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(
        createVendorCategorySchema
    ),
    controller.create
);

/**
 * EXISTING FLOW PRESERVED.
 *
 * createbulk was already public in your current code.
 * It is intentionally left unchanged in this patch so this
 * deployment does not unexpectedly break any existing caller.
 *
 * We should separately review the security of this route later.
 */
vendorCategoryRoutes.post(
    "/createbulk",
    controller.createBulk
);

/**
 * ============================================================
 * PUBLIC READ APIs
 * ============================================================
 */

vendorCategoryRoutes.get(
    "/getall",
    controller.getAll
);

vendorCategoryRoutes.get(
    "/get/:id",
    controller.getById
);

/**
 * ============================================================
 * PROTECTED MANAGEMENT APIs
 * ============================================================
 */

vendorCategoryRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(
        updateVendorCategorySchema
    ),
    controller.update
);

vendorCategoryRoutes.put(
    "/activate/:id",
    authMiddleware,
    controller.activate
);

vendorCategoryRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    controller.deactivate
);

export default vendorCategoryRoutes;