import type { Request, Response } from "express";
import { ManualDeliveryService } from "../services/manualdelivery.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";
import { AppError } from "../../../utils/appError.js";

export class ManualDeliveryDriverController {
    private service = new ManualDeliveryService();

    private getUserId(req: Request): string {
        const userId = req.user?.id;
        if (!userId) {
            throw new AppError("Authentication required", 401);
        }
        return userId;
    }

    private getParamId(req: Request): string {
        const raw = req.params?.id;
        const id = Array.isArray(raw) ? raw[0] : raw;
        if (!id || typeof id !== "string") {
            throw new AppError("Invalid or missing delivery ID", 400);
        }
        return id;
    }

    /**
     * GET /driver/manual-deliveries
     * Lists manual deliveries assigned to the authenticated driver.
     */
    getMyDeliveries = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const result = await this.service.listDriverDeliveries(
                userId,
                req.query
            );

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            return res
                .status(200)
                .json(
                    ResponseUtil.paginated(
                        "Driver manual deliveries fetched successfully",
                        result.deliveries,
                        page,
                        limit,
                        result.total
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to fetch driver manual deliveries"
                    )
                );
        }
    };

    /**
     * GET /driver/manual-deliveries/:id
     * Returns assigned delivery details for the authenticated driver.
     */
    getById = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const id = this.getParamId(req);

            const delivery = await this.service.getDriverDeliveryById(
                id,
                userId
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Assigned manual delivery details fetched successfully",
                        delivery
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to fetch delivery details"
                    )
                );
        }
    };

    /**
     * POST /driver/manual-deliveries/:id/accept
     * Driver accepts delivery assignment.
     */
    accept = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const id = this.getParamId(req);

            const accepted = await this.service.driverAccept(id, userId);

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Delivery assignment accepted successfully",
                        accepted
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to accept delivery assignment"
                    )
                );
        }
    };

    /**
     * POST /driver/manual-deliveries/:id/reject
     * Driver rejects delivery assignment.
     */
    reject = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const id = this.getParamId(req);
            const { reason } = req.body;

            const rejected = await this.service.driverReject(
                id,
                userId,
                reason
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Delivery assignment rejected and returned to available pool",
                        rejected
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to reject delivery assignment"
                    )
                );
        }
    };

    /**
     * PATCH /driver/manual-deliveries/:id/status
     * Driver updates delivery milestone status (PICKED_UP, OUT_FOR_DELIVERY, REACHED, DELIVERED, FAILED).
     */
    updateStatus = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const id = this.getParamId(req);
            const { status, remark, failureReason } = req.body;

            const updated = await this.service.driverUpdateStatus(
                id,
                userId,
                status,
                remark,
                failureReason
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        `Delivery status updated to ${status} successfully`,
                        updated
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to update delivery status"
                    )
                );
        }
    };
}
