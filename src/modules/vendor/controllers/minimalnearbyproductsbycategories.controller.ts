import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { MinimalNearbyProductsByCategoriesService } from "../services/minimalnearbyproductsbycategories.service.js";

export class MinimalNearbyProductsByCategoriesController {

    private service: MinimalNearbyProductsByCategoriesService;

    constructor() {
        this.service =
            new MinimalNearbyProductsByCategoriesService();
    }

    getNearbyCategoryWiseProducts = async (
        req: Request,
        res: Response
    ) => {

        try {

            // Query Params
            const latitude =
                Number(req.query.latitude);

            const longitude =
                Number(req.query.longitude);

            const maxDistance =
                Number(req.query.maxDistance) || 10000;

            const page =
                Number(req.query.page) || 1;

            const limit =
                Number(req.query.limit) || 10;

            // Validation
            if (!latitude || !longitude) {

                return res.status(400).json(

                    ResponseUtil.badRequest(
                        "latitude and longitude are required"
                    )

                );

            }

            const result =
                await this.service.getNearbyCategoryWiseProducts(
                    latitude,
                    longitude,
                    maxDistance,
                    page,
                );

            return res.status(200).json(

                ResponseUtil.success(
                    "Nearby category wise products fetched successfully",
                    result
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