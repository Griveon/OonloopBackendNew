import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { ProductController } from "../controllers/product.controller.js";
import { createProductSchema } from "../validations/product.validation.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { upload } from "../../../config/multer.config.js";
import { ProductImageController } from "../controllers/productimage.controller.js";
import { VariantImageController } from "../controllers/variantimage.controller.js";
import { ProductVideoController } from "../controllers/productvideo.controller.js";

const productRoutes = Router();
const controller = new ProductController();
const productImageController = new ProductImageController();
const variantImageController = new VariantImageController();
const productVideoController = new ProductVideoController();

productRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAll
);

productRoutes.get(
    "/getallbyvendor",
    authMiddleware,
    controller.getAllByVendor
);

productRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getById
);

productRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createProductSchema),
    controller.create
);

productRoutes.put(
    "/update/:id",
    authMiddleware,
    controller.update
);

productRoutes.post(
    "/image/upload",
    upload.array("productImages", 10),
    productImageController.upload
);

productRoutes.post(
    "/variant/image/upload",
    upload.array("variantImages", 10),
    variantImageController.upload
);

productRoutes.post(
    "/video/upload",
    upload.array("productVideos", 1),
    productVideoController.upload
);

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