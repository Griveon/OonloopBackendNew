import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { CategoryProductsService } from "../services/categorywiseproducts.service.js";

export class CategoryProductsController {
    private service: CategoryProductsService;

    constructor() {
        this.service = new CategoryProductsService();
    }

    getCategoryProducts = async (req: Request, res: Response) => {
        try {
            const categoryId = req.query.categoryId as string;
            const vendorId = req.query.vendorId as string | undefined;

            const latitude = Number(req.query.latitude);
            const longitude = Number(req.query.longitude);
            const maxDistance = Number(req.query.maxDistance) || 10000;

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const search = (req.query.search as string) || "";

            if (!categoryId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("categoryId is required"));
            }

            if (!latitude || !longitude) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("latitude and longitude are required"));
            }

            const result = await this.service.getCategoryProducts(
                categoryId,
                latitude,
                longitude,
                maxDistance,
                page,
                limit,
                search,
                vendorId
            );

            return res.status(200).json(
                ResponseUtil.success(
                    "Category products fetched successfully",
                    result
                )
            );
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };
}