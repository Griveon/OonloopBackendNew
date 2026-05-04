import type { Request, Response } from "express";
import { PaymentTransactionService } from "../services/paymenttransaction.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class PaymentTransactionController {
    private service: PaymentTransactionService;

    constructor() {
        this.service = new PaymentTransactionService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    create = async (req: Request, res: Response) => {
        try {
            const result = await this.service.createTransaction(req.body);

            return res
                .status(201)
                .json(ResponseUtil.created("Transaction created", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };
    
    createOrderTransaction = async (req: Request, res: Response) => {
        try {
            const result = await this.service.createOrderTransaction(req.body);

            return res
                .status(201)
                .json(ResponseUtil.created("Transaction created", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    getAll = async (_: Request, res: Response) => {
        try {
            const result = await this.service.getAll();

            return res
                .status(200)
                .json(ResponseUtil.success("Fetched successfully", result));
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

    success = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            const result = await this.service.markSuccess(
                id!,
                req.body.externalPaymentId
            );

            return res
                .status(200)
                .json(ResponseUtil.success("Payment success", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    failed = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            const result = await this.service.markFailed(id!);

            return res
                .status(200)
                .json(ResponseUtil.success("Payment failed", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    cancel = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            const result = await this.service.cancel(id!);

            return res
                .status(200)
                .json(ResponseUtil.success("Payment cancelled", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    verify = async (req: Request, res: Response) => {
        try {
            const result = await this.service.verifyPayment(req.body);

            return res
                .status(200)
                .json(ResponseUtil.success("Payment verified", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    verifyOrder = async (req: Request, res: Response) => {
        try {
            const result = await this.service.verifyOrderPayment(req.body);

            return res
                .status(200)
                .json(ResponseUtil.success("Order payment verified", result));
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };
}