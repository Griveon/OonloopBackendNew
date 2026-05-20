import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { NearbyUserVendorsController } from "../controllers/nearbyuservendors.controller.js";
import { VendorProductsController } from "../controllers/vendorproducts.controller.js";
import { VendorProductDetailsController } from "../controllers/vendorproductdetails.controller.js";
import { NearbyVendorProductsController } from "../controllers/nearbyvendorproducts.controller.js";
import { MinimalNearbyProductsByCategoriesController } from "../controllers/minimalnearbyproductsbycategories.controller.js";
import { CategoryProductsController } from "../controllers/categorywiseproducts.controller.js";

const vendorRoutes = Router();

const controller = new NearbyUserVendorsController();
const vendorProductsController = new VendorProductsController();
const vendorProductDetailsController = new VendorProductDetailsController();
const nearbyVendorProductsController = new NearbyVendorProductsController();
const minimalNearbyProductsByCategoriesController = new MinimalNearbyProductsByCategoriesController();
const categoryProductsController = new CategoryProductsController();
vendorRoutes.get(
    "/nearby",
    authMiddleware,
    controller.getNearbyVendors
);

vendorRoutes.get(
    "/vendorwithproducts/:vendorId",
    authMiddleware,
    vendorProductsController.getVendorWithProducts
);

vendorRoutes.get(
    "/:vendorId/product/:productId",
    authMiddleware,
    vendorProductDetailsController.getVendorProductDetails
);

vendorRoutes.get(
    "/nearby-products",
    authMiddleware,
    nearbyVendorProductsController.getNearbyVendorProducts
);

vendorRoutes.get(
    "/nearby-products-by-categories",
    authMiddleware,
    minimalNearbyProductsByCategoriesController.getNearbyCategoryWiseProducts
);

vendorRoutes.get(
    "/category-wise-nearby-products",
    authMiddleware,
    categoryProductsController.getCategoryProducts
);

export default vendorRoutes;