import { Router } from "express";
import { GSTRuleController } from "../controllers/gstrule.controller.js";
import {
    createGSTRuleSchema,
    updateGSTRuleSchema,
} from "../validations/gstrule.validation.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

const router = Router();
const controller = new GSTRuleController();

const gstRuleRoutes = Router();

gstRuleRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createGSTRuleSchema),
    controller.create
);

gstRuleRoutes.post(
    "/createbulk",
    controller.createBulk
);

gstRuleRoutes.get("/getall", authMiddleware, controller.getAll);
gstRuleRoutes.get("/get/:id", authMiddleware, controller.getById);

gstRuleRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateGSTRuleSchema),
    controller.update
);

gstRuleRoutes.put("/activate/:id", authMiddleware, controller.activate);
gstRuleRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);

export default gstRuleRoutes;