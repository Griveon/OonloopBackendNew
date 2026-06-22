import { Router } from "express";

import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

import { DriverWalletController } from "../controllers/driverwallet.controller.js";

const router = Router();

const controller =
    new DriverWalletController();

router.post(
    "/create",
    authMiddleware,
    controller.createWallet
);

router.get(
    "/:driverId",
    authMiddleware,
    controller.getWallet
);

export default router;