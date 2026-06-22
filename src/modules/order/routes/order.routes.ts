import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

import { OrderController } from "../controllers/order.controller.js";
import { OrderSummuryController } from "../controllers/ordersummury.controller.js";
import { UserOrdersController } from "../controllers/userorders.controller.js";
import { VendorOrderController } from "../controllers/vendororders.controller.js";
import { DriverOrderController } from "../controllers/driverorders.controller.js";

const orderRoutes = Router();

const controller = new OrderController();
const orderSummuryController = new OrderSummuryController();
const userOrdersController = new UserOrdersController();
const vendorOrdersController = new VendorOrderController();
const driverOrderController = new DriverOrderController();

orderRoutes.get("/getall", authMiddleware, controller.getAll);
orderRoutes.get("/get/:id", authMiddleware, controller.getById);
orderRoutes.post("/create", authMiddleware, controller.create);
orderRoutes.put("/update/:id", authMiddleware, controller.update);
orderRoutes.delete("/delete/:id", authMiddleware, controller.delete);

orderRoutes.post(
    "/summary",
    authMiddleware,
    orderSummuryController.getSummary
);

orderRoutes.get(
    "/myorders",
    authMiddleware,
    userOrdersController.getUserOrders
);

orderRoutes.get(
    "/orders",
    authMiddleware,
    vendorOrdersController.getVendorOrders
);

orderRoutes.put(
    "/updateorderstatus/:orderId",
    authMiddleware,
    vendorOrdersController.updateOrderStatus
);

// Driver delivery status update
orderRoutes.put(
    "/updatedeliverystatus/:orderId",
    authMiddleware,
    driverOrderController.updateDeliveryStatus
);

// Driver delivery status update
orderRoutes.put(
    "/assigndriver/:orderId",
    authMiddleware,
    driverOrderController.assignDriver
);

orderRoutes.get(
    "/driverorders",
    authMiddleware,
    driverOrderController.getDriverOrders
);

orderRoutes.get(
    "/driverorderhistory",
    authMiddleware,
    driverOrderController.getHistory
);

orderRoutes.get(
    "/stats",
    authMiddleware,
    driverOrderController.getStats
);

export default orderRoutes;