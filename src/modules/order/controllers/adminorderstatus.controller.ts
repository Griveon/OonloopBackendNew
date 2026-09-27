import type { Request, Response } from "express";
import { AdminOrderStatusService } from "../services/adminorderstatus.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class AdminOrderStatusController {
    private service = new AdminOrderStatusService();

    getStatusOptions = async (_req: Request, res: Response) => {
        try {
            const result = this.service.getStatusOptions();
            return res.status(200).json(
                ResponseUtil.success("Order status options fetched", result)
            );
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    updateParentOrderStatus = async (req: Request, res: Response) => {
        try {
            const orderId = this.getParam(req.params.orderId);
            if (!orderId) {
                return res.status(400).json(ResponseUtil.badRequest("orderId is required"));
            }

            const result = await this.service.updateParentOrderStatus(
                orderId,
                req.body || {},
                this.getAuthenticatedUserId(req)
            );

            return res.status(200).json(
                ResponseUtil.success("Parent order status updated", result)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    updateVendorOrderStatus = async (req: Request, res: Response) => {
        try {
            const vendorOrderId = this.getParam(req.params.vendorOrderId);
            if (!vendorOrderId) {
                return res.status(400).json(ResponseUtil.badRequest("vendorOrderId is required"));
            }

            const result = await this.service.updateVendorOrderStatus(
                vendorOrderId,
                req.body || {},
                this.getAuthenticatedUserId(req)
            );

            return res.status(200).json(
                ResponseUtil.success("Vendor order status updated", result)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    private getParam(param: string | string[] | undefined): string | null {
        const value = Array.isArray(param) ? param[0] : param;
        return value || null;
    }

    private getAuthenticatedUserId(req: Request): string | undefined {
        const user: any = req.user;
        return user?.id || user?._id?.toString?.() || undefined;
    }
}
