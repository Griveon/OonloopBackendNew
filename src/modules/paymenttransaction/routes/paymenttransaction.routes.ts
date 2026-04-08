import { Router } from "express";
import { PaymentTransactionController } from "../controllers/paymenttransaction.controller.js";
import { createPaymentTransactionSchema } from "../validations/paymenttransaction.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const paymentTransactionsRoutes = Router();
const controller = new PaymentTransactionController();

paymentTransactionsRoutes.post(
    "/create",
    authMiddleware,
    controller.create
);

paymentTransactionsRoutes.get("/getall", authMiddleware, controller.getAll);

paymentTransactionsRoutes.post("/verify", authMiddleware, controller.verify);

paymentTransactionsRoutes.get("/get/:id", authMiddleware, controller.getById);

paymentTransactionsRoutes.put("/success/:id", authMiddleware, controller.success);

paymentTransactionsRoutes.put("/failed/:id", authMiddleware, controller.failed);

paymentTransactionsRoutes.put("/cancel/:id", authMiddleware, controller.cancel);

export default paymentTransactionsRoutes;