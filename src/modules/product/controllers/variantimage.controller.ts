import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { uploadVariantImagesToR2 } from "../utils/r2uploadvariant.util.js";
import { VariantImageService } from "../services/variantimage.service.js";
import { ProductModel } from "../models/product.model.js";

export class VariantImageController {
    private service: VariantImageService;

    constructor() {
        this.service = new VariantImageService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    upload = async (req: Request, res: Response) => {
        try {
            const files: any = Array.isArray(req.files)
                ? req.files
                : (req.files?.variantImages as any | undefined) || [];

            if (!files.length) {
                return res.status(400).json(ResponseUtil.badRequest("No files uploaded"));
            }

            const productId = this.getParam(req.body.productId);
            const variantId = this.getParam(req.body.variantId);

            if (!productId) {
                return res.status(400).json(ResponseUtil.badRequest("Product ID is required"));
            }

            const product = await ProductModel.findById(productId);

            if (product) {
                const urls: any = await uploadVariantImagesToR2(files, product.vendorId);
                const images = await this.service.upload(productId, variantId, urls);

                return res.status(201).json(ResponseUtil.created("Variant images uploaded successfully", images));
            } else {
                return res.status(400).json(ResponseUtil.badRequest("Product not found"));
            }

        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    getImages = async (req: Request, res: Response) => {
        try {
            const productId = this.getParam(req.params.productId);
            const variantIndex = Number(req.params.variantIndex);

            if (!productId || isNaN(variantIndex)) {
                return res.status(400).json(ResponseUtil.badRequest("Product ID and Variant index are required"));
            }

            const images = await this.service.getImages(productId, variantIndex);
            return res.status(200).json(ResponseUtil.success("Variant images fetched successfully", images));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    deleteImage = async (req: Request, res: Response) => {
        try {
            const productId = this.getParam(req.params.productId);
            const variantIndex = Number(req.params.variantIndex);
            const imageId = this.getParam(req.params.imageId);

            if (!productId || isNaN(variantIndex) || !imageId) {
                return res.status(400).json(ResponseUtil.badRequest("Product ID, Variant index, and Image ID are required"));
            }

            const deleted = await this.service.deleteImage(productId, variantIndex, imageId);
            return res.status(200).json(ResponseUtil.success("Variant image deleted successfully", deleted));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };
}