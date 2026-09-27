import { Router } from "express";

import { NearbyUserVendorsController } from "../controllers/nearbyuservendors.controller.js";
import { VendorProductsController } from "../controllers/vendorproducts.controller.js";
import { VendorProductDetailsController } from "../controllers/vendorproductdetails.controller.js";
import { NearbyVendorProductsController } from "../controllers/nearbyvendorproducts.controller.js";
import { MinimalNearbyProductsByCategoriesController } from "../controllers/minimalnearbyproductsbycategories.controller.js";
import { CategoryProductsController } from "../controllers/categorywiseproducts.controller.js";

const vendorRoutes = Router();

const controller =
    new NearbyUserVendorsController();

const vendorProductsController =
    new VendorProductsController();

const vendorProductDetailsController =
    new VendorProductDetailsController();

const nearbyVendorProductsController =
    new NearbyVendorProductsController();

const minimalNearbyProductsByCategoriesController =
    new MinimalNearbyProductsByCategoriesController();

const categoryProductsController =
    new CategoryProductsController();

/**
 * ============================================================
 * PUBLIC CUSTOMER DISCOVERY APIs
 * ============================================================
 *
 * These routes intentionally do NOT require authentication.
 *
 * Guests and authenticated users can both:
 * - find nearby vendors
 * - browse vendor products
 * - open product details
 * - browse nearby category products
 *
 * Authentication will still be enforced on private APIs such as:
 * cart, orders, addresses, checkout, payments, etc.
 */

/**
 * Nearby vendors using latitude / longitude.
 */
vendorRoutes.get(
    "/nearby",
    controller.getNearbyVendors
);

/**
 * Vendor store with its products.
 */
vendorRoutes.get(
    "/vendorwithproducts/:vendorId",
    vendorProductsController.getVendorWithProducts
);

/**
 * Product details belonging to a particular vendor.
 */
vendorRoutes.get(
    "/:vendorId/product/:productId",
    vendorProductDetailsController.getVendorProductDetails
);

/**
 * Products from nearby vendors.
 */
vendorRoutes.get(
    "/nearby-products",
    nearbyVendorProductsController.getNearbyVendorProducts
);

/**
 * Nearby products grouped by categories.
 */
vendorRoutes.get(
    "/nearby-products-by-categories",
    minimalNearbyProductsByCategoriesController.getNearbyCategoryWiseProducts
);

/**
 * Category-wise nearby products.
 */
vendorRoutes.get(
    "/category-wise-nearby-products",
    categoryProductsController.getCategoryProducts
);

/**
 * Public category/subcategory discovery.
 */
vendorRoutes.get(
    "/category-subcategories",
    categoryProductsController.getSubCategories
);

/**
 * Public restaurant discovery.
 */
vendorRoutes.get(
    "/restaurants",
    categoryProductsController.getRestaurants
);

export default vendorRoutes;