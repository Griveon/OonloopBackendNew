import type { Request, Response } from "express";
import { ManualDeliveryService } from "../services/manualdelivery.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";
import { AppError } from "../../../utils/appError.js";

export class ManualDeliveryController {
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
     * GET /manual-deliveries/pickup-default
     * Returns the authenticated vendor's registered store pickup address.
     */
    getDefaultPickup = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const pickup = await this.service.getDefaultPickupAddress(userId);

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Default pickup address retrieved successfully",
                        pickup
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to retrieve default pickup address"
                    )
                );
        }
    };

    /**
     * POST /manual-deliveries/calculate-distance
     * Previews the distance between pickup and dropoff coordinates.
     */
    calculateDistance = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const distance = await this.service.calculateDistancePreview(
                userId,
                req.body
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Distance calculated successfully",
                        distance
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to calculate distance"
                    )
                );
        }
    };

    /**
     * POST /manual-deliveries
     * Creates a new manual delivery request.
     */
    create = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const delivery = await this.service.createManualDelivery(
                userId,
                req.body
            );

            return res
                .status(201)
                .json(
                    ResponseUtil.created(
                        "Manual delivery created successfully",
                        delivery
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to create manual delivery"
                    )
                );
        }
    };

    /**
     * GET /manual-deliveries
     * Lists accessible manual deliveries with pagination and filtering.
     */
    getAll = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const result = await this.service.listDeliveries(userId, req.query);

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            return res
                .status(200)
                .json(
                    ResponseUtil.paginated(
                        "Manual deliveries fetched successfully",
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
                        error.message || "Failed to fetch manual deliveries"
                    )
                );
        }
    };

    /**
     * GET /manual-deliveries/:id
     * Returns full manual delivery details by ID.
     */
    getById = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const id = this.getParamId(req);

            const delivery = await this.service.getDeliveryById(id, userId);

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Manual delivery details fetched successfully",
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
     * PATCH /manual-deliveries/:id
     * Updates eligible request fields on a manual delivery.
     */
    update = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const id = this.getParamId(req);

            const updated = await this.service.updateDelivery(
                id,
                userId,
                req.body
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Manual delivery updated successfully",
                        updated
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to update manual delivery"
                    )
                );
        }
    };

    /**
     * POST /manual-deliveries/:id/assign-driver
     * Assigns a driver to a manual delivery request.
     */
    assignDriver = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const id = this.getParamId(req);
            const { driverId } = req.body;

            const updated = await this.service.assignDriver(
                id,
                userId,
                driverId
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Driver assigned successfully",
                        updated
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to assign driver"
                    )
                );
        }
    };

    /**
     * POST /manual-deliveries/:id/cancel
     * Cancels a manual delivery request.
     */
    cancel = async (req: Request, res: Response) => {
        try {
            const userId = this.getUserId(req);
            const id = this.getParamId(req);
            const { reason } = req.body;

            const cancelled = await this.service.cancelDelivery(
                id,
                userId,
                reason
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Manual delivery cancelled successfully",
                        cancelled
                    )
                );
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            return res
                .status(statusCode)
                .json(
                    ResponseUtil.badRequest(
                        error.message || "Failed to cancel delivery"
                    )
                );
        }
    };
}
