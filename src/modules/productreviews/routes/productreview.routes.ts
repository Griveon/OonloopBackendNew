import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { ProductReviewController } from "../controllers/productreview.controller.js";

const productReviewRoutes = Router();

const controller =
    new ProductReviewController();

productReviewRoutes.post(
    "/create",
    authMiddleware,
    controller.create
);

productReviewRoutes.get(
    "/product/:productId",
    controller.getByProduct
);

productReviewRoutes.get(
    "/summary/:productId",
    controller.getSummary
);

export default productReviewRoutes;