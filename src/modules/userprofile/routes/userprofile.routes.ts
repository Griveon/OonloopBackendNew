import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { UserProfileController } from "../controllers/userprofile.controller.js";

const userProfileRoutes = Router();
const controller = new UserProfileController();

userProfileRoutes.get("/me", authMiddleware, controller.getProfile);

userProfileRoutes.post(
    "/create",
    authMiddleware,
    controller.createProfile
);

userProfileRoutes.put("/update", authMiddleware, controller.updateProfile);

userProfileRoutes.post("/address", authMiddleware, controller.addAddress);

userProfileRoutes.put("/address/update/:addressId", authMiddleware, controller.updateAddress);

userProfileRoutes.delete("/address/:addressId", authMiddleware, controller.deleteAddress);

userProfileRoutes.put("/address/default/:addressId", authMiddleware, controller.setDefaultAddress);

export default userProfileRoutes;