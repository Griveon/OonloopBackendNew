import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { ProductContainerController } from "../controllers/productcontainer.controller.js";
import { ProductContainerProductsController } from "../controllers/productcontainerproducts.controller.js";

const router = Router();

const controller =
    new ProductContainerController();
const productContainerProductsController =
    new ProductContainerProductsController();

const productContainerRoutes = Router();

productContainerRoutes.post(
    "/create",
    authMiddleware,
    controller.create
);

productContainerRoutes.get(
    "/products/:containerId",
    productContainerProductsController.getProducts
);

productContainerRoutes.get(
    "/getall",
    controller.getAll
);

productContainerRoutes.get(
    "/get/:id",
    controller.getById
);

productContainerRoutes.put(
    "/update/:id",
    authMiddleware,
    controller.update
);

productContainerRoutes.put(
    "/activate/:id",
    authMiddleware,
    controller.activate
);

productContainerRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    controller.deactivate
);

export default productContainerRoutes;