// src/modules/order/controllers/customerorders.controller.ts

import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { CustomerOrderService } from "../services/customerorders.service.js";

export class CustomerOrderController {
    private service = new CustomerOrderService();

    getCustomerDeliveryOtp = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;

            const userId =
                (req as any)?.user?._id ||
                (req as any)?.user?.id ||
                (req as any)?.authUser?._id ||
                (req as any)?.authUser?.id ||
                req.query.userId as string ||
                req.body?.userId;

            if (!orderId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("orderId is required")
                );
            }

            if (!userId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("userId is required")
                );
            }

            const otpData = await this.service.getCustomerDeliveryOtp(
                orderId,
                userId
            );

            return res.status(200).json(
                ResponseUtil.success(
                    "Customer delivery OTP fetched successfully",
                    otpData
                )
            );
        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(error.message)
            );
        }
    };
}