import { Router } from "express";
import { DriverProfileController } from "../controllers/driverprofile.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

const driverProfileRoutes = Router();

const controller =
    new DriverProfileController();

driverProfileRoutes.post(
    "/create",
    controller.createDriver
);

driverProfileRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getDriverById
);

driverProfileRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAllDrivers
);

driverProfileRoutes.put(
    "/update/:id",
    authMiddleware,
    controller.updateDriver
);

driverProfileRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.deleteDriver
);

export default driverProfileRoutes;