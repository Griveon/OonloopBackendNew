import { Router } from "express";

import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

import { ProductController } from "../controllers/product.controller.js";

import { createProductSchema } from "../validations/product.validation.js";

import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

import { upload } from "../../../config/multer.config.js";

import { ProductImageController } from "../controllers/productimage.controller.js";

import { VariantImageController } from "../controllers/variantimage.controller.js";

import { ProductVideoController } from "../controllers/productvideo.controller.js";

import { ProductSearchController } from "../controllers/globalproductsearch.controller.js";

const productRoutes = Router();

const controller =
    new ProductController();

const searchController =
    new ProductSearchController();

const productImageController =
    new ProductImageController();

const variantImageController =
    new VariantImageController();

const productVideoController =
    new ProductVideoController();

/**
 * ============================================================
 * PROTECTED VENDOR / MANAGEMENT READ API
 * ============================================================
 *
 * We intentionally keep this protected because "getall"
 * may expose vendor/admin-oriented catalogue information.
 */
productRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAll
);

/**
 * ============================================================
 * PUBLIC CUSTOMER PRODUCT DISCOVERY
 * ============================================================
 */

/**
 * Recent products shown on customer-facing pages.
 */
productRoutes.get(
    "/recent_products",
    controller.getRecentProducts
);

/**
 * Products attached to a publicly visible vendor coupon.
 */
productRoutes.get(
    "/getproductsbyvendorcouponid/:couponId",
    controller.getVendorCouponProducts
);

/**
 * ============================================================
 * PROTECTED VENDOR / MANAGEMENT APIS
 * ============================================================
 */

productRoutes.get(
    "/getallbyvendor",
    authMiddleware,
    controller.getAllByVendor
);

productRoutes.get(
    "/searchbyvendor",
    authMiddleware,
    controller.searchByVendor
);

productRoutes.get(
    "/searchmaincatalog",
    authMiddleware,
    controller.searchMainCatalog
);

/**
 * ============================================================
 * PUBLIC PRODUCT DETAILS
 * ============================================================
 *
 * A guest must be able to open a product before logging in.
 */
productRoutes.get(
    "/get/:id",
    controller.getById
);

/**
 * Public customer global search.
 */
productRoutes.get(
    "/globalsearch",
    searchController.SearchProducts
);

/**
 * ============================================================
 * PROTECTED CREATE / UPDATE
 * ============================================================
 */

productRoutes.post(
    "/create",
    authMiddleware,
    controller.create
);

productRoutes.put(
    "/update/:id",
    authMiddleware,
    controller.update
);

productRoutes.post(
    "/calculatehandling",
    authMiddleware,
    controller.calculateHandling
);

/**
 * ============================================================
 * EXISTING MEDIA UPLOAD FLOW
 * ============================================================
 *
 * IMPORTANT:
 * These routes were already public in your existing production
 * code. They are intentionally left unchanged in this patch
 * so guest browsing changes do not accidentally alter your
 * vendor-management workflow.
 *
 * We should audit these separately later because upload routes
 * normally should have authorization.
 */

productRoutes.post(
    "/image/upload",
    upload.array(
        "productImages",
        10
    ),
    productImageController.upload
);

productRoutes.post(
    "/variant/image/upload",
    upload.array(
        "variantImages",
        10
    ),
    variantImageController.upload
);

productRoutes.post(
    "/video/upload",
    upload.array(
        "productVideos",
        1
    ),
    productVideoController.upload
);

/**
 * ============================================================
 * PROTECTED INVENTORY MANAGEMENT
 * ============================================================
 */

productRoutes.put(
    "/status/:id",
    authMiddleware,
    controller.toggleStatus
);

productRoutes.put(
    "/quantity/:id",
    authMiddleware,
    controller.updateQuantity
);

export default productRoutes;