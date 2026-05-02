import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { VendorProductDetailsService } from "../services/vendorproductdetails.service.js";

export class VendorProductDetailsController {
    private service: VendorProductDetailsService;

    constructor() {
        this.service = new VendorProductDetailsService();
    }

    getVendorProductDetails = async (req: Request, res: Response) => {
        try {
            const { vendorId, productId } = req.params;

            if (!vendorId || !productId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Vendor ID and Product ID are required"));
            }

            const data = await this.service.getVendorProductDetails(
                vendorId,
                productId
            );

            return res.status(200).json(
                ResponseUtil.success("Product details fetched successfully", data)
            );
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };
}