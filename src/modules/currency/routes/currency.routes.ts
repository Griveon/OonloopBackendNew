import { Router } from "express";
import { CurrencyController } from "../controllers/currency.controller.js";
import { createCurrencySchema, updateCurrencySchema } from "../validations/currency.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";

const router = Router();
const controller = new CurrencyController();

router.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createCurrencySchema),
    controller.createCurrency
);

router.get(
    "/getall",
    authMiddleware,
    controller.getAllCurrencies
);

router.get(
    "/getall/q",
    authMiddleware,
    controller.getAllCurrenciesWithQuery
);

router.get(
    "/get/:id",
    authMiddleware,
    controller.getCurrencyById
);

router.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateCurrencySchema),
    controller.updateCurrency
);

router.put(
    "/deactivate/:id",
    authMiddleware,
    controller.deactivateCurrency
);

router.put(
    "/activate/:id",
    authMiddleware,
    controller.activateCurrency
);

export default router;