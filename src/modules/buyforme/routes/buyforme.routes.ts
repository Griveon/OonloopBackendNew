import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { ResponseUtil } from "../../../utils/response.util.js";
import { buyForMeImageUpload } from "../config/buyformeupload.config.js";
import { BuyForMeController } from "../controllers/buyforme.controller.js";

const buyForMeRoutes = Router();
const c = new BuyForMeController();

// Single "image" upload with clean 400s for size/type errors.
const imageUpload = (req: Request, res: Response, next: NextFunction) =>
    buyForMeImageUpload.single("image")(req, res, (err: any) => {
        if (err) {
            const msg =
                err.code === "LIMIT_FILE_SIZE"
                    ? "Image must be 5 MB or smaller"
                    : err.message || "Upload failed";
            return res.status(400).json(ResponseUtil.badRequest(msg));
        }
        next();
    });

// public info
buyForMeRoutes.get("/pricing", c.getPricing);

// shopping-list image upload -> { url } for an "uploaded" item
buyForMeRoutes.post("/upload-image", authMiddleware, imageUpload, c.uploadImage);

// customer: build the request
buyForMeRoutes.post("/draft", authMiddleware, c.draft);
buyForMeRoutes.post("/:id/items", authMiddleware, c.addItem);
buyForMeRoutes.put("/items/:itemId", authMiddleware, c.updateItem);
buyForMeRoutes.delete("/items/:itemId", authMiddleware, c.removeItem);
buyForMeRoutes.put("/:id/preferred-store", authMiddleware, c.setPreferredStore);
buyForMeRoutes.put("/:id/delivery", authMiddleware, c.setDelivery);

// customer: budget + submit
buyForMeRoutes.post("/:id/quote", authMiddleware, c.quote);
buyForMeRoutes.post("/:id/submit", authMiddleware, c.submit);

// customer: lists + tracking
buyForMeRoutes.get("/my", authMiddleware, c.getMy);

// shopper: offer/accept (before /get/:id and /:id/* so they don't collide)
buyForMeRoutes.get("/rider/requests", authMiddleware, c.getOpenRequests);
buyForMeRoutes.get("/rider/bookings", authMiddleware, c.getShopperRequests);
buyForMeRoutes.get("/rider/history", authMiddleware, c.getShopperHistory);

buyForMeRoutes.get("/get/:id", authMiddleware, c.getById);
buyForMeRoutes.get("/:id/track", authMiddleware, c.track);
buyForMeRoutes.post("/:id/accept", authMiddleware, c.accept);
buyForMeRoutes.post("/:id/bill", authMiddleware, c.setBill);

// shopper: fulfilment / delivery
buyForMeRoutes.put("/:id/status", authMiddleware, c.advanceStatus);
buyForMeRoutes.get("/:id/delivery-otp", authMiddleware, c.getDeliveryOtp);
buyForMeRoutes.post("/:id/verify-delivery", authMiddleware, c.verifyDelivery);

// shopper: per-item status
buyForMeRoutes.put("/items/:itemId/status", authMiddleware, c.updateItemStatus);

export default buyForMeRoutes;
