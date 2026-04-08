import { Router } from "express";
import { UserSingupController } from "../controllers/usersignup.controller.js";
import { validate } from "../../user/middlewares/validate.middleware.js";
import { signupSchema } from "../validations/user.validation.js";
import { UserLoginController } from "../controllers/userlogin.controller.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { UserController } from "../controllers/userprofile.controller.js";

const userAuthRoutes = Router();
const userSingupController = new UserSingupController();
const userLoginController = new UserLoginController();
const userController = new UserController();

userAuthRoutes.post(
    "/signup",
    validate(signupSchema),
    userSingupController.signup
);
userAuthRoutes.post(
    "/login",
    userLoginController.login
);

userAuthRoutes.put("/profile/update", authMiddleware, userController.updateProfile);

userAuthRoutes.post("/send-otp", userLoginController.sendOtp);
userAuthRoutes.post("/verify-otp", userLoginController.verifyOtp);
userAuthRoutes.put("/update-user-pin", userLoginController.updatePin);

export default userAuthRoutes;