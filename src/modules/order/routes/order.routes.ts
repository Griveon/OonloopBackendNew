import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

import { OrderController } from "../controllers/order.controller.js";
import { OrderSummuryController } from "../controllers/ordersummury.controller.js";
import { UserOrdersController } from "../controllers/userorders.controller.js";
import { VendorOrderController } from "../controllers/vendororders.controller.js";
import { DriverOrderController } from "../controllers/driverorders.controller.js";
import { CustomerOrderController } from "../controllers/customerorders.controller.js";

const orderRoutes = Router();

const controller = new OrderController();
const orderSummuryController = new OrderSummuryController();
const userOrdersController = new UserOrdersController();
const vendorOrdersController = new VendorOrderController();
const driverOrderController = new DriverOrderController();
const customerOrderController = new CustomerOrderController();

/**
 * Parent Order APIs
 *
 * OrderModel = customer/payment/checkout parent order.
 * OrderVendorModel = seller/driver operational order.
 */
orderRoutes.post(
    "/create",
    authMiddleware,
    controller.create
);

orderRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAll
);

orderRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getById
);

orderRoutes.put(
    "/update/:id",
    authMiddleware,
    controller.update
);

orderRoutes.put(
    "/status/:id",
    authMiddleware,
    controller.updateStatus
);

orderRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.delete
);

/**
 * Order summary
 */
orderRoutes.post(
    "/summary",
    authMiddleware,
    orderSummuryController.getSummary
);

/**
 * User/customer orders
 */
orderRoutes.get(
    "/myorders",
    authMiddleware,
    controller.getMyOrders
);

orderRoutes.get(
    "/customer-delivery-otp/:orderId",
    authMiddleware,
    customerOrderController.getCustomerDeliveryOtp
);

/**
 * Old customer order route.
 */
orderRoutes.get(
    "/user/myorders",
    authMiddleware,
    userOrdersController.getUserOrders
);

/**
 * Vendor order flow
 */
orderRoutes.get(
    "/vendororders",
    authMiddleware,
    vendorOrdersController.getVendorOrders
);

orderRoutes.put(
    "/vendor/update-status/:orderId",
    authMiddleware,
    vendorOrdersController.updateOrderStatus
);

orderRoutes.get(
    "/admin/orders",
    authMiddleware,
    controller.getAdminOrders,
);

/**
 * Old vendor routes.
 */
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

/**
 * New driver routes.
 *
 * These support:
 * /driverorders/driver/available-orders
 * /driverorders/driver/take-order/:orderId
 * /driverorders/driver/orders
 */
orderRoutes.get(
    "/driver/available-orders",
    authMiddleware,
    driverOrderController.getAvailableOrders
);

orderRoutes.put(
    "/driver/take-order/:orderId",
    authMiddleware,
    driverOrderController.takeOrder
);

orderRoutes.put(
    "/driver/assign/:orderId",
    authMiddleware,
    driverOrderController.assignDriver
);

orderRoutes.get(
    "/driver/orders",
    authMiddleware,
    driverOrderController.getDriverOrders
);

orderRoutes.get(
    "/driver/history",
    authMiddleware,
    driverOrderController.getHistory
);

orderRoutes.get(
    "/driver/stats",
    authMiddleware,
    driverOrderController.getStats
);

orderRoutes.put(
    "/driver/update-delivery-status/:orderId",
    authMiddleware,
    driverOrderController.updateDeliveryStatus
);

orderRoutes.put(
    "/driver/verify-pickup/:orderId",
    authMiddleware,
    driverOrderController.verifyPickup
);

orderRoutes.put(
    "/driver/verify-customer-delivery/:orderId",
    authMiddleware,
    driverOrderController.verifyCustomerDelivery
);

/**
 * Old driver routes.
 *
 * These support your current frontend constants:
 *
 * /driverorders/availabledriverorders
 * /driverorders/takeorder/:orderId
 * /driverorders/assigndriver/:orderId
 * /driverorders/driverorders
 * /driverorders/driverorderhistory
 * /driverorders/stats
 * /driverorders/updatedeliverystatus/:orderId
 */
orderRoutes.get(
    "/availabledriverorders",
    authMiddleware,
    driverOrderController.getAvailableOrders
);

orderRoutes.put(
    "/takeorder/:orderId",
    authMiddleware,
    driverOrderController.takeOrder
);

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

orderRoutes.put(
    "/updatedeliverystatus/:orderId",
    authMiddleware,
    driverOrderController.updateDeliveryStatus
);

/**
 * Old OTP route.
 */
orderRoutes.get(
    "/vendor-pickup-otp/:orderId",
    authMiddleware,
    vendorOrdersController.getVendorPickupOtp
);

orderRoutes.post(
    "/:orderId/partial-pickup-reassign",
    authMiddleware,
    driverOrderController.partialPickupAndReassign
);

orderRoutes.post(
    "/reassignvendors/:orderId",
    authMiddleware,
    driverOrderController.getReassignVendors
);


export default orderRoutes;