import { Router } from "express";


import {
    authMiddleware,
} from "../../../middlewares/authmiddleware/auth.middleware.js";
import { UserReportController } from "../controller/userreport.controller.js";

const userReportRoutes = Router();

const userReportController =
    new UserReportController();

userReportRoutes.get(
    "/users",
    authMiddleware,
    userReportController.getUsersReport
);

userReportRoutes.get(
    "/users/summary",
    authMiddleware,
    userReportController.getUsersSummary
);

userReportRoutes.get(
    "/users/download",
    authMiddleware,
    userReportController.downloadUsersReport
);

export default userReportRoutes;