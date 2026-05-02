import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { VendorProductsService } from "../services/vendorproducts.service.js";

export class VendorProductsController {
    private service: VendorProductsService;

    constructor() {
        this.service = new VendorProductsService();
    }

    getVendorWithProducts = async (req: Request, res: Response) => {
        try {
            const { vendorId } = req.params;

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const search = req.query.search as string;
            const category = req.query.category as string;
            const minPrice = Number(req.query.minPrice);
            const maxPrice = Number(req.query.maxPrice);
            const inStock = req.query.inStock === "true";

            const data = await this.service.getVendorWithProducts(
                vendorId,
                page,
                limit,
                search,
                category,
                minPrice,
                maxPrice,
                inStock
            );

            return res.status(200).json({
                success: true,
                message: "Vendor details fetched successfully",
                data: {
                    vendor: data.vendor,
                    categories: data.categories,
                    products: data.products,
                },
                meta: {
                    page: data.page,
                    limit: data.limit,
                    total: data.total,
                    totalPages: data.totalPages,
                },
            });
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };
}