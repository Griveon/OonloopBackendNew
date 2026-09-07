import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { BuyForMeService } from "../services/buyforme.service.js";

export class BuyForMeController {
    private service = new BuyForMeService();

    private uid(req: Request) {
        return req.user?.id as string;
    }

    // GET /buyforme/pricing (public)
    getPricing = (_req: Request, res: Response) =>
        res.status(200).json(ResponseUtil.success("Pricing", this.service.getPricing()));

    // POST /buyforme/draft
    draft = async (req: Request, res: Response) => {
        try {
            const r = await this.service.getOrCreateDraft(this.uid(req));
            return res.status(200).json(ResponseUtil.success("Draft request", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    // POST /buyforme/:id/items
    addItem = async (req: Request, res: Response) => {
        try {
            const r = await this.service.addItem(req.params.id as string, this.uid(req), req.body);
            return res.status(201).json(ResponseUtil.created("Item added", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    // PUT /buyforme/items/:itemId
    updateItem = async (req: Request, res: Response) => {
        try {
            const r = await this.service.updateItem(req.params.itemId as string, this.uid(req), req.body);
            return res.status(200).json(ResponseUtil.success("Item updated", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    // DELETE /buyforme/items/:itemId
    removeItem = async (req: Request, res: Response) => {
        try {
            const r = await this.service.removeItem(req.params.itemId as string, this.uid(req));
            return res.status(200).json(ResponseUtil.success("Item removed", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    // PUT /buyforme/:id/preferred-store
    setPreferredStore = async (req: Request, res: Response) => {
        try {
            const r = await this.service.setPreferredStore(req.params.id as string, this.uid(req), req.body);
            return res.status(200).json(ResponseUtil.success("Preferred store set", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    // PUT /buyforme/:id/delivery
    setDelivery = async (req: Request, res: Response) => {
        try {
            const r = await this.service.setDelivery(req.params.id as string, this.uid(req), req.body);
            return res.status(200).json(ResponseUtil.success("Delivery set", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    // POST /buyforme/:id/quote
    quote = async (req: Request, res: Response) => {
        try {
            const r = await this.service.quote(req.params.id as string, this.uid(req), Number(req.body.budget));
            return res.status(200).json(ResponseUtil.success("Price summary", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    // POST /buyforme/:id/submit
    submit = async (req: Request, res: Response) => {
        try {
            const r = await this.service.submit(req.params.id as string, this.uid(req));
            return res.status(200).json(ResponseUtil.success("Request submitted", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    // GET /buyforme/my
    getMy = async (req: Request, res: Response) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const r = await this.service.getMyRequests(this.uid(req), page, limit);
            return res.status(200).json(
                ResponseUtil.paginated("My requests", r.items, r.page, r.limit, r.total)
            );
        } catch (e: any) {
            return res.status(500).json(ResponseUtil.serverError(e.message));
        }
    };

    // GET /buyforme/get/:id
    getById = async (req: Request, res: Response) => {
        try {
            const r = await this.service.getRequest(req.params.id as string, this.uid(req));
            return res.status(200).json(ResponseUtil.success("Request", r));
        } catch (e: any) {
            return res.status(404).json(ResponseUtil.notFound(e.message));
        }
    };

    // GET /buyforme/:id/track
    track = async (req: Request, res: Response) => {
        try {
            const r = await this.service.track(req.params.id as string, this.uid(req));
            return res.status(200).json(ResponseUtil.success("Track", r));
        } catch (e: any) {
            return res.status(404).json(ResponseUtil.notFound(e.message));
        }
    };

    // ---- shopper ----
    getOpenRequests = async (req: Request, res: Response) => {
        try {
            const r = await this.service.getOpenRequests(this.uid(req));
            return res.status(200).json(ResponseUtil.success("Open requests", r));
        } catch (e: any) {
            return res.status(500).json(ResponseUtil.serverError(e.message));
        }
    };

    accept = async (req: Request, res: Response) => {
        try {
            const r = await this.service.acceptRequest(req.params.id as string, this.uid(req));
            return res.status(200).json(ResponseUtil.success("Request accepted", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    getShopperRequests = async (req: Request, res: Response) => {
        try {
            const r = await this.service.getShopperRequests(this.uid(req));
            return res.status(200).json(ResponseUtil.success("My shopper jobs", r));
        } catch (e: any) {
            return res.status(500).json(ResponseUtil.serverError(e.message));
        }
    };

    updateItemStatus = async (req: Request, res: Response) => {
        try {
            const r = await this.service.updateItemStatus(req.params.itemId as string, this.uid(req), req.body);
            return res.status(200).json(ResponseUtil.success("Item status updated", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };

    setBill = async (req: Request, res: Response) => {
        try {
            const r = await this.service.setBill(req.params.id as string, this.uid(req), Number(req.body.actualBillAmount));
            return res.status(200).json(ResponseUtil.success("Bill recorded", r));
        } catch (e: any) {
            return res.status(400).json(ResponseUtil.badRequest(e.message));
        }
    };
}
