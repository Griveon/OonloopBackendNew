import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { OrderController } from "../controllers/order.controller.js";
import { OrderSummuryController } from "../controllers/ordersummury.controller.js";
import { UserOrdersController } from "../controllers/userorders.controller.js";

const orderRoutes = Router();
const controller = new OrderController();
const orderSummuryController = new OrderSummuryController();
const userOrdersController = new UserOrdersController();

orderRoutes.get("/getall", authMiddleware, controller.getAll);
orderRoutes.get("/get/:id", authMiddleware, controller.getById);
orderRoutes.post("/create", authMiddleware, controller.create);
orderRoutes.put("/update/:id", authMiddleware, controller.update);
orderRoutes.delete("/delete/:id", authMiddleware, controller.delete);
orderRoutes.post("/summary", authMiddleware, orderSummuryController.getSummary);
orderRoutes.get("/myorders", authMiddleware, userOrdersController.getUserOrders);

export default orderRoutes;