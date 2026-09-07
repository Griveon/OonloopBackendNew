import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { BuyForMeController } from "../controllers/buyforme.controller.js";

const buyForMeRoutes = Router();
const c = new BuyForMeController();

// public info
buyForMeRoutes.get("/pricing", c.getPricing);

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

buyForMeRoutes.get("/get/:id", authMiddleware, c.getById);
buyForMeRoutes.get("/:id/track", authMiddleware, c.track);
buyForMeRoutes.post("/:id/accept", authMiddleware, c.accept);
buyForMeRoutes.post("/:id/bill", authMiddleware, c.setBill);

// shopper: per-item status
buyForMeRoutes.put("/items/:itemId/status", authMiddleware, c.updateItemStatus);

export default buyForMeRoutes;
