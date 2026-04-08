import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { ProductVideoService } from "../services/productvideo.service.js";
import { ProductModel } from "../models/product.model.js";
import { uploadProductVideosToR2 } from "../utils/uploadproductvideostocloudinary.js";

export class ProductVideoController {
    private service: ProductVideoService;

    constructor() {
        this.service = new ProductVideoService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    upload = async (req: Request, res: Response) => {
        try {
            const files: any = Array.isArray(req.files)
                ? req.files
                : (req.files?.productVideos as any | undefined) || [];

            if (!files.length) {
                return res.status(400).json(
                    ResponseUtil.badRequest("No video files uploaded")
                );
            }

            const productId = this.getParam(req.body.productId);

            if (!productId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Product ID is required")
                );
            }

            const product = await ProductModel.findById(productId);

            if (!product) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Product not found")
                );
            }

            const urls: any = await uploadProductVideosToR2(
                files,
                product.vendorId
            );

            const updatedProduct: any = await this.service.upload(
                productId,
                urls
            );

            return res.status(201).json(
                ResponseUtil.created(
                    "Product videos uploaded successfully",
                    updatedProduct.videos
                )
            );
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    getVideos = async (req: Request, res: Response) => {
        try {
            const productId = this.getParam(req.params.productId);

            if (!productId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Product ID is required")
                );
            }

            const videos = await this.service.getVideos(productId);

            return res.status(200).json(
                ResponseUtil.success(
                    "Product videos fetched successfully",
                    videos
                )
            );
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    deleteVideo = async (req: Request, res: Response) => {
        try {
            const productId = this.getParam(req.params.productId);
            const videoId = this.getParam(req.params.videoId);

            if (!productId || !videoId) {
                return res.status(400).json(
                    ResponseUtil.badRequest(
                        "Product ID and Video ID are required"
                    )
                );
            }

            const deleted = await this.service.deleteVideo(
                productId,
                videoId
            );

            return res.status(200).json(
                ResponseUtil.success(
                    "Product video deleted successfully",
                    deleted
                )
            );
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };
}