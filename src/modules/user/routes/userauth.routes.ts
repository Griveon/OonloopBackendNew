import { Router } from "express";
import { UserSingupController } from "../controllers/usersignup.controller.js";
import { validate } from "../../user/middlewares/validate.middleware.js";
import { loginSchema, signupSchema } from "../validations/user.validation.js";
import { UserLoginController } from "../controllers/userlogin.controller.js";

const userAuthRoutes = Router();
const userSingupController = new UserSingupController();
const userLoginController = new UserLoginController();

userAuthRoutes.post(
    "/signup",
    validate(signupSchema),
    userSingupController.signup
);
userAuthRoutes.post(
    "/login",
    validate(loginSchema),
    userLoginController.login
);

export default userAuthRoutes;