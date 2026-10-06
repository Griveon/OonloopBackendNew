import { Router } from "express";
// import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { AppVersionController } from "../controller/appversion.controller.js";
import { createOrUpdateAppVersionSchema } from "../validations/appversion.validation.js";

const appVersionRoutes = Router();
const controller = new AppVersionController();

/**
 * Public route:
 * GET /app-version/check?platform=android&version=1.5.0&buildNumber=15
 */
appVersionRoutes.get("/check", controller.checkVersion);

/**
//  * Admin routes (Protected with authMiddleware):
 * PUT /app-version/:platform - Create/Update platform configuration
 * GET /app-version/:platform - Get platform configuration
 * GET /app-version          - Get all platform configurations
 * DELETE /app-version/:platform - Delete platform configuration
 */
appVersionRoutes.put(
    "/:platform",
    // authMiddleware,
    validateUsingZOD(createOrUpdateAppVersionSchema),
    controller.upsertPlatformConfig
);

appVersionRoutes.get(
    "/:platform",
    // authMiddleware,
    controller.getConfigByPlatform
);

appVersionRoutes.get(
    "/",
    // authMiddleware,
    controller.getAllConfigs
);

appVersionRoutes.delete(
    "/:platform",
    // authMiddleware,
    controller.deleteConfigByPlatform
);

export default appVersionRoutes;