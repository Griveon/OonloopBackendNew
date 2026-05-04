import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { UserOrdersService } from "../services/userorders.service.js";

export class UserOrdersController {
    private service: UserOrdersService;

    constructor() {
        this.service = new UserOrdersService();
    }

    // ✅ GET USER ORDERS (LIST)
    getUserOrders = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;
            console.log("User ID from request:", userId);

            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 10);

            const data = await this.service.getUserOrders(userId, page, limit);

            return res
                .status(200)
                .json(ResponseUtil.success("Orders fetched successfully", data));

        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    // ✅ GET SINGLE ORDER DETAILS
    getOrderDetails = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?._id;
            const { orderId } = req.params;

            const order = await this.service.getOrderDetails(orderId, userId);

            return res
                .status(200)
                .json(ResponseUtil.success("Order fetched successfully", order));

        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };
}