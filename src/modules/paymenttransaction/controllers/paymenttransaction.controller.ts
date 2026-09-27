import type { Request, Response } from "express";
import { PaymentTransactionService } from "../services/paymenttransaction.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

type RazorpayWebhookRequest = Request & { rawBody?: Buffer };

export class PaymentTransactionController {
    private service: PaymentTransactionService;

    constructor() {
        this.service = new PaymentTransactionService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    private getHeaderValue(value: string | string[] | undefined): string | null {
        if (Array.isArray(value)) return value[0] || null;
        return value || null;
    }

    create = async (req: Request, res: Response) => {
        try {
            const result = await this.service.createTransaction(req.body);
            return res.status(201).json(ResponseUtil.created("Transaction created", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    createOrderTransaction = async (req: Request, res: Response) => {
        try {
            const result = await this.service.createOrderTransaction(req.body);
            return res.status(201).json(ResponseUtil.created("Transaction created", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    createBookingTransaction = async (req: Request, res: Response) => {
        try {
            const body = { ...req.body, userId: req.user?.id ?? req.body.userId };
            const result = await this.service.createBookingTransaction(body);
            return res.status(201).json(ResponseUtil.created("Transaction created", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    verifyBooking = async (req: Request, res: Response) => {
        try {
            const result = await this.service.verifyBookingPayment(req.body);
            return res.status(200).json(ResponseUtil.success("Booking payment verified", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    createBuyForMeTransaction = async (req: Request, res: Response) => {
        try {
            const body = { ...req.body, userId: req.user?.id ?? req.body.userId };
            const result = await this.service.createBuyForMeTransaction(body);
            return res.status(201).json(ResponseUtil.created("Transaction created", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    verifyBuyForMe = async (req: Request, res: Response) => {
        try {
            const result = await this.service.verifyBuyForMePayment(req.body);
            return res.status(200).json(ResponseUtil.success("Buy For Me payment verified", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    createPreorderTransaction = async (req: Request, res: Response) => {
        try {
            const body = { ...req.body, userId: req.user?.id ?? req.body.userId };
            const result = await this.service.createPreorderTransaction(body);
            return res.status(201).json(ResponseUtil.created("Transaction created", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    verifyPreorder = async (req: Request, res: Response) => {
        try {
            const result = await this.service.verifyPreorderPayment(req.body);
            return res.status(200).json(ResponseUtil.success("Preorder payment verified", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    getAll = async (_: Request, res: Response) => {
        try {
            const result = await this.service.getAll();
            return res.status(200).json(ResponseUtil.success("Fetched successfully", result));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    getById = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res.status(400).json(ResponseUtil.badRequest("ID is required"));
            }

            const result = await this.service.getById(id);
            return res.status(200).json(ResponseUtil.success("Fetched successfully", result));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    success = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res.status(400).json(ResponseUtil.badRequest("ID is required"));
            }

            const result = await this.service.markSuccess(id, req.body.externalPaymentId);
            return res.status(200).json(ResponseUtil.success("Payment success", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    failed = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res.status(400).json(ResponseUtil.badRequest("ID is required"));
            }

            const result = await this.service.markFailed(id);
            return res.status(200).json(ResponseUtil.success("Payment failed", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    cancel = async (req: Request, res: Response) => {
        try {
            const id = this.getParam(req.params.id);

            if (!id) {
                return res.status(400).json(ResponseUtil.badRequest("ID is required"));
            }

            const result = await this.service.cancel(id);
            return res.status(200).json(ResponseUtil.success("Payment cancelled", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    verify = async (req: Request, res: Response) => {
        try {
            const result = await this.service.verifyPayment(req.body);
            return res.status(200).json(ResponseUtil.success("Payment verified", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    verifyOrder = async (req: Request, res: Response) => {
        try {
            const result = await this.service.verifyOrderPayment(req.body);
            return res.status(200).json(ResponseUtil.success("Order payment verified", result));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // Public Razorpay server-to-server callback. Do NOT put auth middleware on
    // this endpoint; security comes from x-razorpay-signature validation.
    razorpayWebhook = async (req: RazorpayWebhookRequest, res: Response) => {
        try {
            const signature = this.getHeaderValue(
                req.headers["x-razorpay-signature"]
            );

            if (!signature) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Razorpay webhook signature is missing")
                );
            }

            if (!req.rawBody) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Razorpay webhook raw body is missing")
                );
            }

            const result = await this.service.handleRazorpayWebhook(
                req.body,
                req.rawBody,
                signature
            );

            return res.status(200).json(
                ResponseUtil.success("Razorpay webhook processed", result)
            );
        } catch (error: any) {
            console.error("Razorpay webhook error:", error?.message || error);

            const status = error?.message === "Invalid Razorpay webhook signature"
                ? 400
                : 500;

            return res.status(status).json(
                status === 400
                    ? ResponseUtil.badRequest(error.message)
                    : ResponseUtil.serverError(error.message)
            );
        }
    };
}
