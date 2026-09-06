import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { PreorderService } from "../services/preorder.service.js";

export class PreorderController {
    private service = new PreorderService();

    // ---------------- Seller: config ----------------

    // POST /preorder/config/:productId  (auth, seller)
    upsertConfig = async (req: Request, res: Response) => {
        try {
            const vendorId = req.user?.id as string;
            const productId = req.params.productId as string;
            const config = await this.service.upsertConfig(
                vendorId,
                productId,
                req.body
            );
            return res
                .status(200)
                .json(ResponseUtil.success("Preorder config saved", config));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // GET /preorder/config/mine  (auth, seller)
    getMyConfigs = async (req: Request, res: Response) => {
        try {
            const vendorId = req.user?.id as string;
            const configs = await this.service.getMyConfigs(vendorId);
            return res
                .status(200)
                .json(ResponseUtil.success("Preorder configs", configs));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    // PUT /preorder/config/:productId/active  (auth, seller)
    setConfigActive = async (req: Request, res: Response) => {
        try {
            const vendorId = req.user?.id as string;
            const productId = req.params.productId as string;
            const isActive = !!req.body.isActive;
            const config = await this.service.setConfigActive(
                vendorId,
                productId,
                isActive
            );
            return res
                .status(200)
                .json(ResponseUtil.success("Preorder config updated", config));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // ---------------- Customer: listing ----------------

    // GET /preorder/products  (public) — ?lat&lng&maxDistance&page&limit&search
    listProducts = async (req: Request, res: Response) => {
        try {
            const params: {
                lat: number;
                lng: number;
                maxDistance?: number;
                page?: number;
                limit?: number;
                search?: string;
            } = {
                lat: Number(req.query.lat),
                lng: Number(req.query.lng),
            };
            if (req.query.maxDistance) params.maxDistance = Number(req.query.maxDistance);
            if (req.query.page) params.page = Number(req.query.page);
            if (req.query.limit) params.limit = Number(req.query.limit);
            if (req.query.search) params.search = String(req.query.search);

            const result = await this.service.listProducts(params);
            return res.status(200).json(
                ResponseUtil.paginated(
                    "Preorder products",
                    result.items,
                    result.page,
                    result.limit,
                    result.total
                )
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // ---------------- Customer: orders ----------------

    // POST /preorder/order  (auth)
    createOrder = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const order = await this.service.createOrder(userId, req.body);
            return res
                .status(201)
                .json(
                    ResponseUtil.created(
                        "Preorder created. Proceed to payment.",
                        order
                    )
                );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // GET /preorder/my  (auth)
    getMyOrders = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const status = (req.query.status as string) || undefined;
            const result = await this.service.getMyOrders(
                userId,
                page,
                limit,
                status
            );
            return res.status(200).json(
                ResponseUtil.paginated(
                    "My preorders",
                    result.items,
                    result.page,
                    result.limit,
                    result.total
                )
            );
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    // GET /preorder/get/:id  (auth)
    getById = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const order = await this.service.getById(
                req.params.id as string,
                userId
            );
            return res
                .status(200)
                .json(ResponseUtil.success("Preorder fetched", order));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    // PUT /preorder/cancel/:id  (auth)
    cancel = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as string;
            const order = await this.service.cancel(
                req.params.id as string,
                userId
            );
            return res
                .status(200)
                .json(ResponseUtil.success("Preorder cancelled", order));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    // ---------------- Seller: incoming + status ----------------

    // GET /preorder/vendor/orders  (auth, seller)
    getVendorOrders = async (req: Request, res: Response) => {
        try {
            const vendorId = req.user?.id as string;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const status = (req.query.status as string) || undefined;
            const result = await this.service.getVendorOrders(
                vendorId,
                page,
                limit,
                status
            );
            return res.status(200).json(
                ResponseUtil.paginated(
                    "Incoming preorders",
                    result.items,
                    result.page,
                    result.limit,
                    result.total
                )
            );
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    // PUT /preorder/vendor/orders/:id/status  (auth, seller)
    updateStatus = async (req: Request, res: Response) => {
        try {
            const vendorId = req.user?.id as string;
            const order = await this.service.updateStatus(
                vendorId,
                req.params.id as string,
                String(req.body.status)
            );
            return res
                .status(200)
                .json(ResponseUtil.success("Preorder status updated", order));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };
}
