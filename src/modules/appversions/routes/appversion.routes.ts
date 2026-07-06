import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { AppVersionController } from "../controller/appversion.controller.js";

const appVersionRoutes = Router();

const controller = new AppVersionController();

appVersionRoutes.get(
    "/check",
    controller.checkVersion
);

appVersionRoutes.post(
    "/create-or-update",
    authMiddleware,
    controller.createOrUpdate
);

appVersionRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAll
);

appVersionRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getById
);

appVersionRoutes.put(
    "/update/:id",
    authMiddleware,
    controller.updateById
);

appVersionRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.deleteById
);

export default appVersionRoutes;