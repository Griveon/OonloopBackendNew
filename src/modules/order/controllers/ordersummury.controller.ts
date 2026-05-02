import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { OrderSummuryService } from "../services/ordersummury.service.js";

export class OrderSummuryController {
    private service: OrderSummuryService;

    constructor() {
        this.service = new OrderSummuryService();
    }

    getSummary = async (req: Request, res: Response) => {
        try {
            const { items } = req.body;

            if (!Array.isArray(items) || items.length === 0) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Items are required"));
            }

            const summary = await this.service.getOrderSummary(items);

            return res
                .status(200)
                .json(ResponseUtil.success("Order summary fetched", summary));

        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };
}