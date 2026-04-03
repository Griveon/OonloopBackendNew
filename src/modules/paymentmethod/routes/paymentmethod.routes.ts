import { Router } from "express";
import { PaymentMethodController } from "../controllers/paymentmethod.controller.js";
import {
    createPaymentMethodSchema,
    updatePaymentMethodSchema,
} from "../validations/paymentmethod.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const paymentMethodRoutes = Router();
const paymentMethodController = new PaymentMethodController();

paymentMethodRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createPaymentMethodSchema),
    paymentMethodController.create
);

paymentMethodRoutes.get(
    "/getall",
    authMiddleware,
    paymentMethodController.getAll
);

paymentMethodRoutes.get(
    "/get/:id",
    authMiddleware,
    paymentMethodController.getById
);

paymentMethodRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updatePaymentMethodSchema),
    paymentMethodController.update
);

paymentMethodRoutes.put(
    "/activate/:id",
    authMiddleware,
    paymentMethodController.activate
);

paymentMethodRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    paymentMethodController.deactivate
);

paymentMethodRoutes.delete(
    "/delete/:id",
    authMiddleware,
    paymentMethodController.delete
);

export default paymentMethodRoutes;