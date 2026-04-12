import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { WishlistController } from "../controllers/wishlist.controller.js";

const wishlistRoutes = Router();
const controller = new WishlistController();

wishlistRoutes.get("/me", authMiddleware, controller.getWishlist);

wishlistRoutes.post("/add", authMiddleware, controller.add);

wishlistRoutes.delete("/remove/:itemId", authMiddleware, controller.remove);

wishlistRoutes.delete("/clear", authMiddleware, controller.clear);

export default wishlistRoutes;