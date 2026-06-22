import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { DriverOrderService } from "../services/driverorders.service.js";

export class DriverOrderController {

    private service = new DriverOrderService();

    updateDeliveryStatus = async (
        req: Request,
        res: Response
    ) => {
        try {
            const { orderId } = req.params;

            const {
                driverId,
                deliveryStatus,
            } = req.body;

            if (!driverId) {
                return res.status(400).json(
                    ResponseUtil.badRequest(
                        "driverId is required"
                    )
                );
            }

            if (!deliveryStatus) {
                return res.status(400).json(
                    ResponseUtil.badRequest(
                        "deliveryStatus is required"
                    )
                );
            }

            const updatedOrder =
                await this.service.updateDeliveryStatus(
                    orderId,
                    driverId,
                    deliveryStatus
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Delivery status updated successfully",
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

    assignDriver = async (
        req: Request,
        res: Response
    ) => {
        try {

            const { orderId } = req.params;
            console.log(orderId)

            const { driverId } = req.body;

            if (!driverId) {
                return res.status(400).json(
                    ResponseUtil.badRequest(
                        "driverId is required"
                    )
                );
            }

            const order =
                await this.service.assignDriver(
                    orderId,
                    driverId
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Driver assigned successfully",
                    order
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

    getDriverOrders = async (
        req: Request,
        res: Response
    ) => {
        try {

            const driverId =
                req.query.driverId as string;

            const page =
                Number(req.query.page) || 1;

            const limit =
                Number(req.query.limit) || 10;

            const filter: any = {};

            if (
                req.query.deliveryStatus
            ) {
                filter.deliveryStatus =
                    req.query.deliveryStatus;
            }

            if (
                req.query.orderNumber
            ) {
                filter.orderNumber =
                    req.query.orderNumber;
            }

            const orders =
                await this.service.getDriverOrders(
                    driverId,
                    page,
                    limit,
                    filter
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Driver orders fetched successfully",
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

    getHistory = async (
        req: Request,
        res: Response
    ) => {

        try {

            const driverId =
                req.query.driverId as string;

            const page =
                Number(req.query.page) || 1;

            const limit =
                Number(req.query.limit) || 10;

            const filter: any = {};

            if (
                req.query.orderNumber
            ) {
                filter.orderNumber =
                    req.query.orderNumber;
            }

            if (
                req.query.fromDate
            ) {
                filter.fromDate =
                    req.query.fromDate;
            }

            if (
                req.query.toDate
            ) {
                filter.toDate =
                    req.query.toDate;
            }

            const history =
                await this.service.getHistory(
                    driverId,
                    page,
                    limit,
                    filter
                );

            return res.status(200).json(
                ResponseUtil.paginated(
                    "Driver order history fetched successfully",
                    history.items,
                    page,
                    limit,
                    history.total
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

    getStats = async (
        req: Request,
        res: Response
    ) => {

        try {

            const driverId =
                req.query.driverId as string;

            const stats =
                await this.service.getStats(
                    driverId
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Driver dashboard stats fetched successfully",
                    stats
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


}