import { Router } from "express";
import { PlatformCommissionController } from "../controllers/platformcommission.controller.js";
import {
    createPlatformCommissionSchema,
    updatePlatformCommissionSchema,
} from "../validations/platformcommission.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const platformCommissionRoutes = Router();
const controller = new PlatformCommissionController();

platformCommissionRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createPlatformCommissionSchema),
    controller.create
);

platformCommissionRoutes.get("/getall", authMiddleware, controller.getAll);

platformCommissionRoutes.get("/get/:id", authMiddleware, controller.getById);

platformCommissionRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updatePlatformCommissionSchema),
    controller.update
);

platformCommissionRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);
platformCommissionRoutes.put("/activate/:id", authMiddleware, controller.activate);

export default platformCommissionRoutes;