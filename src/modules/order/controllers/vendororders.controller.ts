import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { VendorOrderService } from "../services/vendororders.service.js";

export class VendorOrderController {
    private service = new VendorOrderService();

    getVendorOrders = async (req: Request, res: Response) => {
        try {
            const vendorId = req.query.vendorId as string;

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            if (!vendorId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("vendorId is required")
                );
            }

            const filter: any = {};

            if (req.query.status) {
                filter.status = req.query.status;
            }

            if (req.query.sellerStatus) {
                filter.sellerStatus = req.query.sellerStatus;
            }

            if (req.query.deliveryStatus) {
                filter.deliveryStatus = req.query.deliveryStatus;
            }

            if (req.query.paymentStatus) {
                filter.paymentStatus = req.query.paymentStatus;
            }

            if (req.query.orderNumber) {
                filter.orderNumber = req.query.orderNumber;
            }

            const orders = await this.service.getVendorOrders(
                vendorId,
                page,
                limit,
                filter
            );

            return res.status(200).json(
                ResponseUtil.success(
                    "Vendor orders fetched successfully",
                    orders
                )
            );
        } catch (error: any) {
            return res.status(500).json(
                ResponseUtil.serverError(error.message)
            );
        }
    };

    updateOrderStatus = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;

            const {
                vendorId,
                status,
                remark,
            } = req.body;

            if (!orderId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("orderId is required")
                );
            }

            if (!vendorId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("vendorId is required")
                );
            }

            if (!status) {
                return res.status(400).json(
                    ResponseUtil.badRequest("status is required")
                );
            }

            const updatedOrder = await this.service.updateOrderStatus(
                orderId,
                vendorId,
                status,
                remark
            );

            return res.status(200).json(
                ResponseUtil.success(
                    "Vendor order status updated successfully",
                    updatedOrder
                )
            );
        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(error.message)
            );
        }
    };

    getVendorPickupOtp = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;

            const vendorId =
                req.query.vendorId as string ||
                req.body?.vendorId;

            if (!orderId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("orderId is required")
                );
            }

            if (!vendorId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("vendorId is required")
                );
            }

            const otpData = await this.service.getVendorPickupOtp(
                orderId,
                vendorId
            );

            return res.status(200).json(
                ResponseUtil.success(
                    "Pickup OTP fetched successfully",
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