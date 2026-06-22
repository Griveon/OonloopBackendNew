// controllers/vendororders.controller.ts

import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { VendorOrderService } from "../services/vendororders.service.js";

export class VendorOrderController {

    private service = new VendorOrderService();

    getVendorOrders = async (
        req: Request,
        res: Response
    ) => {
        try {
            const vendorId = req.query.vendorId as string;

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const filter: any = {};

            if (req.query.status) {
                filter.status = req.query.status;
            }

            if (req.query.paymentStatus) {
                filter.paymentStatus =
                    req.query.paymentStatus;
            }

            if (req.query.orderNumber) {
                filter.orderNumber =
                    req.query.orderNumber;
            }

            const orders =
                await this.service.getVendorOrders(
                    vendorId,
                    page,
                    limit,
                    filter
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Orders fetched successfully",
                    orders.items
                )
            );
        } catch (error: any) {
            return res.status(500).json(
                ResponseUtil.serverError(
                    error.message
                )
            );
        }
    };

    updateOrderStatus = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { orderId } = req.params;

            const {
                vendorId,
                status,
            } = req.body;

            if (!vendorId) {
                return res.status(400).json(
                    ResponseUtil.badRequest(
                        "vendorId is required"
                    )
                );
            }

            if (!status) {
                return res.status(400).json(
                    ResponseUtil.badRequest(
                        "status is required"
                    )
                );
            }

            const updatedOrder =
                await this.service.updateOrderStatus(
                    orderId,
                    vendorId,
                    status
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Order status updated successfully",
                    updatedOrder
                )
            );
        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.serverError(
                    error.message
                )
            );
        }
    };
}