import { Router } from "express";
import { RibbonController } from "../controllers/ribbon.controller.js";

import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { createRibbonSchema, updateRibbonSchema } from "../validations/ribbon.validation.js";

const ribbonRoutes = Router();
const controller = new RibbonController();

ribbonRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createRibbonSchema),
    controller.create
);

ribbonRoutes.get("/getall", authMiddleware, controller.getAll);
ribbonRoutes.get("/get/:id", authMiddleware, controller.getById);

ribbonRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateRibbonSchema),
    controller.update
);

ribbonRoutes.put("/activate/:id", authMiddleware, controller.activate);
ribbonRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);

export default ribbonRoutes;