import { Router } from "express";
import { UserPreferenceController } from "../controller/userpreference.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";

const userPreferenceRoutes = Router();
const userPreferenceController = new UserPreferenceController();

userPreferenceRoutes.use(authMiddleware);

userPreferenceRoutes.get(
    "/get",
    userPreferenceController.getPreferences
);

userPreferenceRoutes.post(
    "/set",
    userPreferenceController.setPreference
);

userPreferenceRoutes.post(
    "/set-multiple",
    userPreferenceController.setPreferences
);

userPreferenceRoutes.post(
    "/reset",
    userPreferenceController.resetPreferences
);

export default userPreferenceRoutes;