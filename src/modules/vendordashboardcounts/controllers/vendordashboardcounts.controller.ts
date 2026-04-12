import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { VendorDashboardCountsService } from "../services/vendordashboardcounts.service.js";

export class VendorDashboardCountsController {
    private service: VendorDashboardCountsService;

    constructor() {
        this.service = new VendorDashboardCountsService();
    }

    private getUserId(req: any): any {
        const userId = req.user?.id;
        return userId ? userId.toString() : null;
    }

    getCounts = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);

            if (!userId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("User not authenticated"));
            }

            const result = await this.service.getCounts(userId);

            return res
                .status(200)
                .json(ResponseUtil.success("Dashboard counts fetched", result));
        } catch (error: any) {
            console.error(error);
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };
}