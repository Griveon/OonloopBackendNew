import type {
    Request,
    Response,
} from "express";

import { ResponseUtil } from "../../../utils/response.util.js";
import { ProductViewService } from "../services/productview.service.js";

export class ProductViewController {

    private service =
        new ProductViewService();

    addView = async (
        req: Request,
        res: Response
    ) => {

        try {

            const userId =
                req.user?.id;

            const productId =
                req.params.productId;

            const result =
                await this.service.addView(
                    userId,
                    productId
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "View added",
                    result
                )
            );

        } catch (error: any) {

            return res.status(400).json(
                ResponseUtil.badRequest(
                    error.message
                )
            );
        }
    };

    getRecentlyViewed = async (
        req: Request,
        res: Response
    ) => {

        try {

            const userId =
                req.user?.id;

            const limit =
                Number(
                    req.query.limit || 20
                );

            const result =
                await this.service.getRecentlyViewed(
                    userId,
                    limit
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Fetched successfully",
                    result
                )
            );

        } catch (error: any) {

            return res.status(400).json(
                ResponseUtil.badRequest(
                    error.message
                )
            );
        }
    };
}