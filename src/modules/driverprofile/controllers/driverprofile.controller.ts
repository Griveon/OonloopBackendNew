import { ResponseUtil } from "../../../utils/response.util.js";
import { DriverProfileService } from "../services/driverprofile.service.js";
import type { Request, Response } from "express";

export class DriverProfileController {
    private service =
        new DriverProfileService();

    createDriver = async (
        req: Request,
        res: Response
    ) => {
        try {
            const data =
                await this.service.createDriver(
                    req.body
                );

            return res
                .status(201)
                .json(
                    ResponseUtil.created(
                        "Driver created successfully",
                        data
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(
                    ResponseUtil.badRequest(
                        error.message
                    )
                );
        }
    };

    getDriverById = async (
        req: Request,
        res: Response
    ) => {
        try {
            const data =
                await this.service.getDriverById(
                    req.params.id
                );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Driver fetched successfully",
                        data
                    )
                );
        } catch (error: any) {
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        error.message
                    )
                );
        }
    };

    getAllDrivers = async (
        req: Request,
        res: Response
    ) => {
        try {
            const page = Number(
                req.query.page || 1
            );

            const limit = Number(
                req.query.limit || 10
            );

            const search =
                (req.query.search as string) ||
                "";

            const result =
                await this.service.getAllDrivers({
                    page,
                    limit,
                    search,
                });

            return res
                .status(200)
                .json(
                    ResponseUtil.paginated(
                        "Drivers fetched successfully",
                        result.drivers,
                        page,
                        limit,
                        result.total
                    )
                );
        } catch (error: any) {
            return res
                .status(500)
                .json(
                    ResponseUtil.serverError(
                        error.message
                    )
                );
        }
    };

    updateDriver = async (
        req: Request,
        res: Response
    ) => {
        try {
            const driver =
                await this.service.updateDriver(
                    req.params.id,
                    req.body
                );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Driver updated successfully",
                        driver
                    )
                );
        } catch (error: any) {
            return res
                .status(400)
                .json(
                    ResponseUtil.badRequest(
                        error.message
                    )
                );
        }
    };

    deleteDriver = async (
        req: Request,
        res: Response
    ) => {
        try {
            await this.service.deleteDriver(
                req.params.id
            );

            return res
                .status(200)
                .json(
                    ResponseUtil.success(
                        "Driver deleted successfully",
                        {}
                    )
                );
        } catch (error: any) {
            return res
                .status(404)
                .json(
                    ResponseUtil.notFound(
                        error.message
                    )
                );
        }
    };
}