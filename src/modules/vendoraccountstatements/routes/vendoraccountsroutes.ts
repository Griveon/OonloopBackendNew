import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { VendorAccountStatementController } from "../controllers/vendoraccountstatement.controller.js";

const vendorAccountStatementRoutes = Router();

const controller = new VendorAccountStatementController();

vendorAccountStatementRoutes.post(
    "/get",
    authMiddleware,
    controller.getVendorAccountStatement
);

vendorAccountStatementRoutes.post(
    "/export",
    authMiddleware,
    controller.exportVendorAccountStatementExcel
);

export default vendorAccountStatementRoutes;