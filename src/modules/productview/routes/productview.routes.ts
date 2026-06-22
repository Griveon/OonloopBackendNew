import { Router } from "express";

import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

import { ProductViewController } from "../controllers/productview.controller.js";

const productViewRoutes =
    Router();

const controller =
    new ProductViewController();

productViewRoutes.post(
    "/view/:productId",
    authMiddleware,
    controller.addView
);

productViewRoutes.get(
    "/recentlyviewed",
    authMiddleware,
    controller.getRecentlyViewed
);

export default productViewRoutes;