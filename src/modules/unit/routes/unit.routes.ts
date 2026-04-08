import { Router } from "express";
import { UnitController } from "../controllers/unit.controller.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { createUnitSchema, updateUnitSchema } from "../validations/unit.validation.js";

const unitRoutes = Router();
const controller = new UnitController();

unitRoutes.post("/create", authMiddleware, validateUsingZOD(createUnitSchema), controller.create);
unitRoutes.get("/getall", authMiddleware, controller.getAll);
unitRoutes.get("/get/:id", authMiddleware, controller.getById);
unitRoutes.put("/update/:id", authMiddleware, validateUsingZOD(updateUnitSchema), controller.update);
unitRoutes.delete("/delete/:id", authMiddleware, controller.delete);
unitRoutes.put("/activate/:id", authMiddleware, controller.activate);
unitRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);

export default unitRoutes;