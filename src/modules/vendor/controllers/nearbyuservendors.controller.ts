import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { NearbyUserVendorsService } from "../services/nearbyuservendors.service.js";

export class NearbyUserVendorsController {
    private service: NearbyUserVendorsService;

    constructor() {
        this.service = new NearbyUserVendorsService();
    }

    getNearbyVendors = async (req: Request, res: Response) => {
        try {
            const latitude = Number(req.query.latitude);
            const longitude = Number(req.query.longitude);
            const maxDistance = Number(req.query.maxDistance) || 10000;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            if (!latitude || !longitude) {
                return res
                    .status(400)
                    .json(
                        ResponseUtil.badRequest(
                            "Latitude and Longitude are required"
                        )
                    );
            }

            const vendors = await this.service.getNearbyVendors(
                longitude,
                latitude,
                maxDistance,
                page,
                limit
            );

            return res.status(200).json(
                ResponseUtil.success(
                    "Nearby vendors fetched successfully",
                    vendors
                )
            );
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };
}