import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { DriverOrderService } from "../services/driverorders.service.js";
import { DriverProfileModel } from "../../driverprofile/models/driverprofile.model.js";

export class DriverOrderController {
    private service = new DriverOrderService();

    private async getDriverId(req: Request): Promise<string> {
        const user: any = req.user as any;

        const directDriverId =
            req.body?.driverId ||
            req.query?.driverId ||
            user?.driverId ||
            user?.driverProfile ||
            user?.driver?._id ||
            user?.driver ||
            "";

        if (directDriverId) {
            return String(directDriverId);
        }

        const userId = user?.id || user?._id || user?.userId;

        if (!userId) {
            return "";
        }

        const driverProfile = await DriverProfileModel.findOne({
            user: userId,
            isActive: true,
        })
            .select("_id")
            .lean();

        return driverProfile?._id ? String(driverProfile._id) : "";
    }

    assignDriver = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const driverId = await this.getDriverId(req);

            if (!orderId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("orderId is required"));
            }

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            const order = await this.service.assignDriver(orderId, driverId);

            return res
                .status(200)
                .json(ResponseUtil.success("Driver assigned successfully", order));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    takeOrder = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const driverId = await this.getDriverId(req);

            if (!orderId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("orderId is required"));
            }

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            const order = await this.service.takeOrder(orderId, driverId);

            return res
                .status(200)
                .json(ResponseUtil.success("Delivery accepted successfully", order));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    updateDeliveryStatus = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const driverId = await this.getDriverId(req);

            const {
                deliveryStatus,
                remark,
                currentLocation,
            } = req.body;

            if (!orderId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("orderId is required"));
            }

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            if (!deliveryStatus) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("deliveryStatus is required"));
            }

            const updatedOrder = await this.service.updateDeliveryStatus(
                orderId,
                driverId,
                deliveryStatus,
                {
                    remark,
                    currentLocation,
                }
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Delivery status updated successfully", updatedOrder));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    verifyPickup = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const driverId = await this.getDriverId(req);

            const {
                pickupOtp,
                pickupQrCode,
            } = req.body;

            if (!orderId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("orderId is required"));
            }

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            if (!pickupOtp && !pickupQrCode) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("pickupOtp or pickupQrCode is required"));
            }

            const updatedOrder = await this.service.verifyPickup(
                orderId,
                driverId,
                {
                    pickupOtp,
                    pickupQrCode,
                }
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Pickup verified successfully", updatedOrder));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    verifyCustomerDelivery = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const driverId = await this.getDriverId(req);

            const {
                deliveryOtp,
                signatureUrl,
            } = req.body;

            if (!orderId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("orderId is required"));
            }

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            if (!deliveryOtp && !signatureUrl) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("deliveryOtp or signatureUrl is required"));
            }

            const updatedOrder = await this.service.verifyCustomerDelivery(
                orderId,
                driverId,
                {
                    deliveryOtp,
                    signatureUrl,
                }
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Delivery completed successfully", updatedOrder));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    getDriverOrders = async (req: Request, res: Response) => {
        try {
            const driverId = await this.getDriverId(req);

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const filter: any = {};

            if (req.query.deliveryStatus) {
                filter.deliveryStatus = req.query.deliveryStatus;
            }

            if (req.query.status) {
                filter.status = req.query.status;
            }

            if (req.query.orderNumber) {
                filter.orderNumber = req.query.orderNumber;
            }

            const orders = await this.service.getDriverOrders(
                driverId,
                page,
                limit,
                filter
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Driver orders fetched successfully", orders));
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    getAvailableOrders = async (req: Request, res: Response) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const filter: any = {};

            if (req.query.orderNumber) {
                filter.orderNumber = req.query.orderNumber;
            }

            if (req.query.status) {
                filter.status = req.query.status;
            }

            if (req.query.sellerStatus) {
                filter.sellerStatus = req.query.sellerStatus;
            }

            const orders = await this.service.getAvailableOrders(
                page,
                limit,
                filter
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Available delivery orders fetched successfully", orders));
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    getHistory = async (req: Request, res: Response) => {
        try {
            const driverId = await this.getDriverId(req);

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const filter: any = {};

            if (req.query.orderNumber) {
                filter.orderNumber = req.query.orderNumber;
            }

            if (req.query.fromDate) {
                filter.fromDate = req.query.fromDate;
            }

            if (req.query.toDate) {
                filter.toDate = req.query.toDate;
            }

            const history = await this.service.getHistory(
                driverId,
                page,
                limit,
                filter
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Driver order history fetched successfully", history));
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    getStats = async (req: Request, res: Response) => {
        try {
            const driverId = await this.getDriverId(req);

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            const stats = await this.service.getStats(driverId);

            return res
                .status(200)
                .json(ResponseUtil.success("Driver dashboard stats fetched successfully", stats));
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    partialPickupAndReassign = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const driverId = await this.getDriverId(req);

            const {
                items,
                remark,
            } = req.body;

            if (!orderId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("orderId is required"));
            }

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            if (!Array.isArray(items) || items.length === 0) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Items are required"));
            }

            const result = await this.service.partialPickupAndReassign(
                orderId,
                driverId,
                {
                    items,
                    remark,
                }
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Partial pickup reassigned successfully", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    getReassignVendors = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const driverId = await this.getDriverId(req);

            const {
                product,
                variant,
                shortQuantity,
            } = req.body;

            if (!orderId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("orderId is required"));
            }

            if (!driverId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("driverId is required"));
            }

            if (!product) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("product is required"));
            }

            if (!shortQuantity || Number(shortQuantity) <= 0) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("shortQuantity must be greater than 0"));
            }

            const result = await this.service.getReassignVendors(
                orderId,
                driverId,
                {
                    product,
                    variant,
                    shortQuantity: Number(shortQuantity),
                }
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Reassign vendor list fetched successfully", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };


}