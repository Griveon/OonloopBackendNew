import type { Request, Response } from "express";
import { VendorCouponService } from "../services/vendorcoupon.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class VendorCouponController {
    private service: VendorCouponService;

    constructor() {
        this.service = new VendorCouponService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    create = async (req: Request, res: Response) => {
        try {
            const result = await this.service.create(req.body);

            return res
                .status(201)
                .json(ResponseUtil.created("Coupon created", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    getAll = async (req: Request, res: Response) => {
        try {
            const {
                vendorId,
                page = "1",
                limit = "10",
                isActive,
                discountType,
                couponType,
                search
            } = req.query;

            const result = await this.service.getAll({
                vendorId: vendorId as string,
                page: Number(page),
                limit: Number(limit),
                isActive: isActive as string,
                discountType: discountType as string,
                couponType: couponType as string,
                search: search as string,
            });

            return res.status(200).json(
                ResponseUtil.paginated(
                    "Fetched successfully",
                    result.data,
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

    getById = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("ID is required"));
            }

            const result = await this.service.getById(id);

            return res
                .status(200)
                .json(ResponseUtil.success("Fetched successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    getByVendor = async (req: Request, res: Response) => {
        try {
            const vendorId = this.getParam(req.params.vendorId);

            const result = await this.service.getByVendor(vendorId!);

            return res
                .status(200)
                .json(ResponseUtil.success("Fetched successfully", result));
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
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

            const result = await this.service.update(id, req.body);

            return res
                .status(200)
                .json(ResponseUtil.success("Updated successfully", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            const result = await this.service.delete(id!);

            return res
                .status(200)
                .json(ResponseUtil.success("Deleted successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    activate = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            const result = await this.service.activate(id!);

            return res
                .status(200)
                .json(ResponseUtil.success("Activated successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };

    deactivate = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            const result = await this.service.deactivate(id!);

            return res
                .status(200)
                .json(ResponseUtil.success("Deactivated successfully", result));
        } catch (error: any) {
            return res
                .status(404)
                .json(ResponseUtil.notFound(error.message));
        }
    };
}