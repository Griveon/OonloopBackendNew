import { Router } from "express";
import { VendorCouponController } from "../controllers/vendorcoupon.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import {
    createVendorCouponSchema,
    updateVendorCouponSchema,
} from "../validations/vendorcoupon.validation.js";

const vendorCouponRoutes = Router();
const controller = new VendorCouponController();

vendorCouponRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createVendorCouponSchema),
    controller.create
);

vendorCouponRoutes.get("/getall", authMiddleware, controller.getAll);

vendorCouponRoutes.get("/get/:id", authMiddleware, controller.getById);

vendorCouponRoutes.get("/vendor/:vendorId", authMiddleware, controller.getByVendor);

vendorCouponRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateVendorCouponSchema),
    controller.update
);

vendorCouponRoutes.delete("/delete/:id", authMiddleware, controller.delete);

vendorCouponRoutes.put("/activate/:id", authMiddleware, controller.activate);

vendorCouponRoutes.put("/deactivate/:id", authMiddleware, controller.deactivate);

export default vendorCouponRoutes;