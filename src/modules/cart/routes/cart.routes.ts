import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { CartController } from "../controllers/cart.controller.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { addToCartSchema, updateCartQuantitySchema } from "../validations/cart.validation.js";

const cartRoutes = Router();
const controller = new CartController();

cartRoutes.get("/me", authMiddleware, controller.getCart);

cartRoutes.post("/add", authMiddleware, validateUsingZOD(addToCartSchema), controller.addToCart);

cartRoutes.put("/item/:itemId", authMiddleware, validateUsingZOD(updateCartQuantitySchema), controller.updateQuantity);

cartRoutes.delete("/item/:itemId", authMiddleware, controller.removeItem);

cartRoutes.delete("/clear", authMiddleware, controller.clearCart);

export default cartRoutes;
