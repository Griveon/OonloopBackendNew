import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { ProductImageService } from "../services/productimage.service.js";
import { uploadProductImagesToR2 } from "../utils/r2uploadproduct.util.js";
import { ProductModel } from "../models/product.model.js";

export class ProductImageController {
    private service: ProductImageService;

    constructor() {
        this.service = new ProductImageService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    upload = async (req: Request, res: Response) => {
        try {

            const files: any = Array.isArray(req.files)
                ? req.files
                : (req.files?.productImages as any | undefined) || [];

            if (!files.length) {
                return res.status(400).json(ResponseUtil.badRequest("No files uploaded"));
            }

            const productId = this.getParam(req.body.productId);

            if (!productId) {
                return res.status(400).json(ResponseUtil.badRequest("Product ID is required"));
            }

            const product = await ProductModel.findById(productId);
            if (product) {
                const urls: any = await uploadProductImagesToR2(files, product.vendorId);
                const updatedProduct: any = await this.service.upload(productId, urls);
                return res.status(201).json(
                    ResponseUtil.created("Product images uploaded successfully", updatedProduct.images)
                );
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
            if (!productId) {
                return res.status(400).json(ResponseUtil.badRequest("Product ID is required"));
            }

            const images = await this.service.getImages(productId);
            return res.status(200).json(ResponseUtil.success("Product images fetched successfully", images));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    deleteImage = async (req: Request, res: Response) => {
        try {
            const productId = this.getParam(req.params.productId);
            const imageId = this.getParam(req.params.imageId);

            if (!productId || !imageId) {
                return res.status(400).json(ResponseUtil.badRequest("Product ID and Image ID are required"));
            }

            const deleted = await this.service.deleteImage(productId, imageId);
            return res.status(200).json(ResponseUtil.success("Product image deleted successfully", deleted));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };
}