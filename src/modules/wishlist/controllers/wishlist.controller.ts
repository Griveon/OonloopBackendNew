import type { Request, Response } from "express";
import { WishlistService } from "../services/wishlist.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class WishlistController {
    private service: WishlistService;

    constructor() {
        this.service = new WishlistService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const value = Array.isArray(param) ? param[0] : param;
        return value || null;
    }

    /* 🔥 Get Wishlist */
    getWishlist = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;

            const wishlist = await this.service.getWishlist(userId);

            return res.status(200).json(
                ResponseUtil.success("Wishlist fetched", wishlist)
            );
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message));
        }
    };

    /* 🔥 Add */
    add = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;

            const wishlist = await this.service.add(userId, req.body);

            return res.status(200).json(
                ResponseUtil.success("Added to wishlist", wishlist)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    /* 🔥 Remove */
    remove = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const itemId = this.getParam(req.params.itemId);

            if (!itemId) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Item ID required")
                );
            }

            const wishlist = await this.service.remove(userId, itemId);

            return res.status(200).json(
                ResponseUtil.success("Removed from wishlist", wishlist)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    /* 🔥 Clear */
    clear = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;

            const wishlist = await this.service.clear(userId);

            return res.status(200).json(
                ResponseUtil.success("Wishlist cleared", wishlist)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };
}