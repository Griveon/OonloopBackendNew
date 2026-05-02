import type { Request, Response } from "express";
import { OrderService } from "../services/order.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class OrderController {
    private service = new OrderService();

    create = async (req: Request, res: Response) => {
        try {
            const order = await this.service.create(req.body);
            return res
                .status(201)
                .json(ResponseUtil.created("Order created successfully", order));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    getAll = async (req: Request, res: Response) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const filter = req.query.filter
                ? JSON.parse(req.query.filter as string)
                : {};

            const orders = await this.service.getAll(page, limit, filter);

            return res
                .status(200)
                .json(ResponseUtil.success("Orders fetched successfully", orders));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    getById = async (req: Request, res: Response) => {
        try {
            const order = await this.service.getById(req.params.id);
            return res
                .status(200)
                .json(ResponseUtil.success("Order fetched successfully", order));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const order = await this.service.update(req.params.id, req.body);
            return res
                .status(200)
                .json(ResponseUtil.success("Order updated successfully", order));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            await this.service.delete(req.params.id);
            return res
                .status(200)
                .json(ResponseUtil.success("Order deleted successfully", null));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };
}