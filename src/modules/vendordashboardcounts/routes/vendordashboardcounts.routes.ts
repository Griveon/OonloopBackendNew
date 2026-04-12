import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { VendorDashboardCountsController } from "../controllers/vendordashboardcounts.controller.js";

const vendorDashboardCountsRoutes = Router();
const controller = new VendorDashboardCountsController();

vendorDashboardCountsRoutes.get(
    "/counts",
    authMiddleware,
    controller.getCounts
);

export default vendorDashboardCountsRoutes;