import type { Request, Response } from "express";
import { ProductService } from "../services/product.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class ProductController {
    private service: ProductService;

    constructor() {
        this.service = new ProductService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const product = await this.service.create(data);
            return res
                .status(201)
                .json(ResponseUtil.created("Product created successfully", product));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    getAll = async (req: Request, res: Response) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const filter = req.query.filter ? JSON.parse(req.query.filter as string) : {};
            const products = await this.service.getAll(page, limit, filter);

            return res
                .status(200)
                .json(ResponseUtil.success("Products fetched successfully", products.items));
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    getById = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("ID is required"));
            }

            const product = await this.service.getById(id);
            return res
                .status(200)
                .json(ResponseUtil.success("Product fetched successfully", product));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("ID is required"));
            }

            const updatedProduct = await this.service.update(id, req.body);
            return res
                .status(200)
                .json(ResponseUtil.success("Product updated successfully", updatedProduct));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);
            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("ID is required"));
            }

            await this.service.delete(id);
            return res
                .status(200)
                .json(ResponseUtil.success("Product deleted successfully", null));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };
}