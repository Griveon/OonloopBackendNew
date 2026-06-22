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

    getAllByVendor = async (req: Request, res: Response) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const vendorId = req.query.vendorId as string;
            const search = (req.query.search as string) || "";

            if (!vendorId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("vendorId is required")
                );
            }

            const filter = req.query.filter
                ? JSON.parse(req.query.filter as string)
                : {};

            const finalFilter: any = {
                ...filter,
                vendorId,
            };

            if (search.trim()) {
                finalFilter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                    { slug: { $regex: search, $options: "i" } },
                ];
            }

            const result = await this.service.getAllByVendor(
                page,
                limit,
                finalFilter
            );

            return res.status(200).json(
                ResponseUtil.paginated(
                    "Products fetched successfully",
                    result.items,
                    result.page,
                    result.limit,
                    result.total
                )
            );
        } catch (error: any) {
            return res.status(500).json(
                ResponseUtil.serverError(error.message)
            );
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

            const userId: any = req.user?.id;

            const product = await this.service.getById(id, userId);

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

    toggleStatus = async (req: Request, res: Response) => {
        try {
            const { id }: any = req.params;
            const { isActive } = req.body;

            if (typeof isActive !== "boolean") {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("isActive must be boolean"));
            }

            const product = await this.service.toggleStatus(id, isActive);

            return res
                .status(200)
                .json(ResponseUtil.success("Product status updated", product));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    updateQuantity = async (req: Request, res: Response) => {
        try {
            const { id }: any = req.params;
            const { type, qty, variantId } = req.body;

            if (!["increase", "decrease"].includes(type)) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("type must be increase or decrease"));
            }

            const product = await this.service.updateQuantity(
                id,
                type,
                Number(qty || 0),
                variantId
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Quantity updated", product));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    searchByVendor = async (req: Request, res: Response) => {
        try {
            const vendorId = req.query.vendorId as string;
            const search = (req.query.search as string) || "";

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            if (!vendorId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("vendorId is required"));
            }

            const result = await this.service.searchByVendor(
                vendorId,
                search,
                page,
                limit
            );

            return res.status(200).json(
                ResponseUtil.paginated(
                    "Products fetched successfully",
                    result.items,
                    result.page,
                    result.limit,
                    result.total
                )
            );
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    searchMainCatalog = async (req: Request, res: Response) => {
        try {
            const search = (req.query.search as string) || "";
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            if (!search.trim()) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("search keyword is required"));
            }

            const result = await this.service.searchMainCatalog(
                search,
                page,
                limit
            );

            return res.status(200).json(
                ResponseUtil.paginated(
                    "Main catalog products fetched successfully",
                    result.items,
                    result.page,
                    result.limit,
                    result.total
                )
            );
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    getVendorCouponProducts = async (req: Request, res: Response) => {
        try {
            const { couponId } = req.params;

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;

            const result = await this.service.getVendorCouponProducts(
                couponId,
                page,
                limit
            );

            return res.status(200).json({
                success: true,
                message: "Coupon products fetched successfully",
                data: {
                    coupon: result.coupon,
                    products: result.products,
                },
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / result.limit),
                },
            });
        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(error.message)
            );
        }
    };
}