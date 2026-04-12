import type { Request, Response } from "express";
import { CartService } from "../services/cart.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class CartController {
    private service: CartService;

    constructor() {
        this.service = new CartService();
    }

    /* ✅ Common Param Fix */
    private getParam(param: string | string[] | undefined): string | null {
        const value = Array.isArray(param) ? param[0] : param;
        return value || null;
    }

    /* 🔥 Get Cart */
    getCart = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.badRequest("Unauthorized"));
            }

            const cart = await this.service.getCart(userId);

            return res.status(200).json(
                ResponseUtil.success("Cart fetched successfully", cart)
            );
        } catch (error: any) {
            return res
                .status(500)
                .json(ResponseUtil.serverError(error.message));
        }
    };

    /* 🔥 Add To Cart */
    addToCart = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.badRequest("Unauthorized"));
            }

            const cart = await this.service.addToCart(userId, req.body);

            return res.status(200).json(
                ResponseUtil.success("Item added to cart", cart)
            );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    /* 🔥 Update Quantity */
    updateQuantity = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const itemId = this.getParam(req.params.itemId);

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.badRequest("Unauthorized"));
            }

            if (!itemId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Item ID required"));
            }

            const { quantity } = req.body;

            if (!quantity || quantity < 1) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Valid quantity required"));
            }

            const cart = await this.service.updateQuantity(
                userId,
                itemId,
                quantity
            );

            return res.status(200).json(
                ResponseUtil.success("Cart updated", cart)
            );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    /* 🔥 Remove Item */
    removeItem = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const itemId = this.getParam(req.params.itemId);

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.badRequest("Unauthorized"));
            }

            if (!itemId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Item ID required"));
            }

            const cart = await this.service.removeItem(userId, itemId);

            return res.status(200).json(
                ResponseUtil.success("Item removed", cart)
            );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    /* 🔥 Clear Cart */
    clearCart = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;

            if (!userId) {
                return res
                    .status(401)
                    .json(ResponseUtil.badRequest("Unauthorized"));
            }

            const cart = await this.service.clearCart(userId);

            return res.status(200).json(
                ResponseUtil.success("Cart cleared", cart)
            );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };
}