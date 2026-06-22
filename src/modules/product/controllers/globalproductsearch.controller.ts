import type { Request, Response } from "express";
import { ProductSearchService } from "../services/globalproductsearch.service.js";

export class ProductSearchController {

    private service = new ProductSearchService();

    SearchProducts = async (
        req: Request,
        res: Response
    ) => {
        try {

            const keyword =
                String(req.query.keyword || "").trim();

            const page =
                Number(req.query.page || 1);

            const limit =
                Number(req.query.limit || 20);

            if (!keyword) {
                return res.status(400).json({
                    success: false,
                    message: "Keyword is required",
                });
            }

            const result =
                await this.service.SearchProducts(
                    keyword,
                    page,
                    limit
                );

            return res.status(200).json({
                success: true,
                ...result,
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                message: "Failed to search products",
                error,
            });

        }
    };
}