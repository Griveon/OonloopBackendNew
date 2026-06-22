import type { Request, Response } from "express";
import { UserDashboardService } from "../services/userdashboard.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class UserDashboardController {

    private service: UserDashboardService;

    constructor() {
        this.service = new UserDashboardService();
    }

    getDashboard = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;

            const dashboard = await this.service.getDashboard(userId);

            return res.status(200).json(
                ResponseUtil.success(
                    "Dashboard fetched successfully",
                    dashboard
                )
            );

        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(error.message)
            );
        }
    };
}