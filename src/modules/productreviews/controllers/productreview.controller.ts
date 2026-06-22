import type { Request, Response } from "express";
import { ProductReviewService } from "../services/productreview.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class ProductReviewController {

    private service = new ProductReviewService();

    create = async (req: any, res: Response) => {
        try {

            const review = await this.service.create({
                ...req.body,
                user: req.user.id,
            });

            return res.json(
                ResponseUtil.success(
                    "Review added",
                    review
                )
            );
        } catch (error: any) {
            return res.status(500).json(
                ResponseUtil.serverError(error.message)
            );
        }
    };

    getByProduct = async (
        req: Request,
        res: Response
    ) => {
        try {

            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 10);

            const data =
                await this.service.getProductReviews(
                    req.params.productId,
                    page,
                    limit
                );

            return res.json(
                ResponseUtil.paginated(
                    "Reviews fetched",
                    data.items,
                    data.page,
                    data.limit,
                    data.total
                )
            );
        } catch (error: any) {
            return res.status(500).json(
                ResponseUtil.serverError(error.message)
            );
        }
    };

    getSummary = async (
        req: Request,
        res: Response
    ) => {
        try {

            const summary =
                await this.service.getSummary(
                    req.params.productId
                );

            return res.json(
                ResponseUtil.success(
                    "Review summary",
                    summary
                )
            );

        } catch (error: any) {
            return res.status(500).json(
                ResponseUtil.serverError(error.message)
            );
        }
    };
}