import { BuyForMeRepository } from "../repositories/buyforme.repository.js";
import { ProductModel } from "../../product/models/product.model.js";
import { BFM_PRICING, BFM_SOURCE_MODES } from "../constants/buyforme.constants.js";
import { emitRideRequest, emitRideTaken } from "../../../config/socket.js";

const round2 = (n: number) => Math.round(n * 100) / 100;

export class BuyForMeService {
    private repo = new BuyForMeRepository();

    private async loadOwned(requestId: string, userId: string) {
        const req: any = await this.repo.findById(requestId);
        if (!req) throw new Error("Request not found");
        if (req.user?._id?.toString() !== userId) throw new Error("Request not found");
        return req;
    }

    getPricing() {
        return {
            budgetPresets: BFM_PRICING.BUDGET_PRESETS,
            serviceFee: BFM_PRICING.SERVICE_FEE,
            gstPercent: BFM_PRICING.GST_PERCENT,
            defaultRadiusKm: BFM_PRICING.DEFAULT_RADIUS_KM,
            notes: [
                "We will purchase your items within this budget.",
                "Any unused amount will be refunded.",
                "Prices and availability may vary; we confirm before placing the order.",
            ],
        };
    }

    /** Get the user's open draft, or create one. */
    async getOrCreateDraft(userId: string) {
        let req: any = await this.repo.findDraftByUser(userId);
        if (!req) {
            const requestNumber = await this.repo.generateRequestNumber();
            req = await this.repo.createRequest({
                user: userId as any,
                requestNumber,
                serviceFee: BFM_PRICING.SERVICE_FEE,
                gstPercent: BFM_PRICING.GST_PERCENT,
                radiusKm: BFM_PRICING.DEFAULT_RADIUS_KM,
            });
        }
        return this.getRequest(req._id.toString(), userId);
    }

    /** Add an item (catalog | typed | uploaded). */
    async addItem(requestId: string, userId: string, data: any) {
        const req = await this.loadOwned(requestId, userId);
        if (req.status !== "draft") throw new Error("Request already submitted");

        const source = data.source;
        if (!["catalog", "typed", "uploaded"].includes(source)) {
            throw new Error("Invalid item source");
        }

        const item: any = {
            request: req._id,
            source,
            quantity: Number(data.quantity) || 1,
            unit: data.unit || "",
            note: data.note || "",
        };

        if (source === "catalog") {
            const p: any = await ProductModel.findById(data.productId);
            if (!p) throw new Error("Product not found");
            item.product = p._id;
            item.name = p.name;
            item.image = p.images?.[0]?.url || "";
            let price = p.mrp;
            if (data.variantId) {
                const v = p.variants?.id?.(data.variantId) || p.variants?.find((x: any) => x._id?.toString() === data.variantId);
                if (v) { item.variant = v._id; price = v.price ?? price; }
            }
            item.estimatedPrice = price;
        } else if (source === "typed") {
            if (!data.name) throw new Error("Item name is required");
            item.name = data.name;
            if (data.image) item.image = data.image;
        } else {
            // uploaded — the image itself is the "item" (shopper reads it)
            if (!data.image) throw new Error("Uploaded image url is required");
            item.name = data.name || "Uploaded list";
            item.image = data.image;
        }

        await this.repo.addItem(item);
        return this.getRequest(requestId, userId);
    }

    async updateItem(itemId: string, userId: string, data: any) {
        const item: any = await this.repo.findItemById(itemId);
        if (!item) throw new Error("Item not found");
        const req = await this.loadOwned(item.request.toString(), userId);
        if (req.status !== "draft") throw new Error("Request already submitted");

        const patch: any = {};
        if (data.quantity !== undefined) patch.quantity = Number(data.quantity);
        if (data.unit !== undefined) patch.unit = data.unit;
        if (data.name !== undefined) patch.name = data.name;
        await this.repo.updateItem(itemId, patch);
        return this.getRequest(item.request.toString(), userId);
    }

    async removeItem(itemId: string, userId: string) {
        const item: any = await this.repo.findItemById(itemId);
        if (!item) throw new Error("Item not found");
        const req = await this.loadOwned(item.request.toString(), userId);
        if (req.status !== "draft") throw new Error("Request already submitted");
        await this.repo.deleteItem(itemId);
        return this.getRequest(item.request.toString(), userId);
    }

    async setPreferredStore(requestId: string, userId: string, data: any) {
        await this.loadOwned(requestId, userId);
        const sourceMode = BFM_SOURCE_MODES.includes(data.sourceMode) ? data.sourceMode : "no_preference";
        const patch: any = { sourceMode };
        patch.preferredStore = {
            ...(data.storeId ? { storeId: data.storeId } : {}),
            ...(data.storeName ? { storeName: data.storeName } : {}),
        };
        if (data.radiusKm) patch.radiusKm = Number(data.radiusKm);
        await this.repo.updateById(requestId, patch);
        return this.getRequest(requestId, userId);
    }

    async setDelivery(requestId: string, userId: string, delivery: any) {
        await this.loadOwned(requestId, userId);
        if (!delivery?.mobileNumber || !delivery?.location) {
            throw new Error("mobileNumber and location are required");
        }
        await this.repo.updateById(requestId, { delivery });
        return this.getRequest(requestId, userId);
    }

    /** Full request with items grouped by source + totals. */
    async getRequest(requestId: string, userId: string) {
        const req = await this.loadOwned(requestId, userId);
        const items = await this.repo.findItemsByRequest(requestId);

        const group = (s: string) => items.filter((i: any) => i.source === s);
        return {
            request: req,
            items: {
                catalog: group("catalog"),
                typed: group("typed"),
                uploaded: group("uploaded"),
            },
            totalItems: items.length,
        };
    }

    /** Price summary for a chosen budget. */
    async quote(requestId: string, userId: string, budget: number) {
        await this.loadOwned(requestId, userId);
        if (!budget || budget <= 0) throw new Error("A valid budget is required");

        const serviceFee = BFM_PRICING.SERVICE_FEE;
        const gstAmount = round2((serviceFee * BFM_PRICING.GST_PERCENT) / 100);
        const totalPayable = round2(budget + serviceFee + gstAmount);

        await this.repo.updateById(requestId, {
            budget,
            serviceFee,
            gstPercent: BFM_PRICING.GST_PERCENT,
            gstAmount,
            totalPayable,
        });

        return { budget, serviceFee, gstPercent: BFM_PRICING.GST_PERCENT, gstAmount, totalPayable };
    }

    /** Lock the request after the customer confirms budget + T&C. */
    async submit(requestId: string, userId: string) {
        const req = await this.loadOwned(requestId, userId);
        if (req.status !== "draft") throw new Error("Request already submitted");

        const itemCount = await this.repo.countItems(requestId);
        if (itemCount === 0) throw new Error("Add at least one item");
        if (!req.budget || req.budget <= 0) throw new Error("Set a shopping budget first");
        if (!req.delivery?.mobileNumber) throw new Error("Delivery details are required");

        await this.repo.updateById(requestId, { status: "submitted" });
        return this.getRequest(requestId, userId);
    }

    async getMyRequests(userId: string, page = 1, limit = 10) {
        return this.repo.findByUser(userId, page, limit);
    }

    // ---------- shopper flow ----------

    private shopperSummary(r: any) {
        const u: any = r.user || {};
        return {
            requestId: r._id,
            requestNumber: r.requestNumber,
            status: r.status,
            customer: {
                name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
                mobileNumber: u.mobileNumber,
            },
            delivery: r.delivery,
            budget: r.budget,
            shopperFee: r.serviceFee,
        };
    }

    async getOpenRequests(userId: string) {
        if (await this.repo.isShopperBusy(userId)) return { busy: true, requests: [] };
        const open = await this.repo.findOpenRequests();
        return { busy: false, requests: open.map((r: any) => this.shopperSummary(r)) };
    }

    async acceptRequest(requestId: string, userId: string) {
        if (await this.repo.isShopperBusy(userId)) {
            throw new Error("You already have an active job");
        }
        const req = await this.repo.acceptAtomic(requestId, userId);
        if (!req) throw new Error("Request already taken or not open");
        emitRideTaken(requestId);
        return this.shopperSummary(req);
    }

    async getShopperRequests(userId: string) {
        const list = await this.repo.findByShopper(userId);
        return list.map((r: any) => this.shopperSummary(r));
    }

    /** Shopper marks an item available / unavailable / purchased. */
    async updateItemStatus(itemId: string, userId: string, data: any) {
        const item: any = await this.repo.findItemById(itemId);
        if (!item) throw new Error("Item not found");
        const req: any = await this.repo.findById(item.request.toString());
        if (!req) throw new Error("Request not found");
        if (req.shopper?._id?.toString() !== userId) throw new Error("Not the assigned shopper");

        const patch: any = { status: data.status };
        if (data.actualPrice !== undefined) patch.actualPrice = Number(data.actualPrice);
        if (data.note !== undefined) patch.note = data.note;
        await this.repo.updateItem(itemId, patch);
        return this.repo.findItemsByRequest(item.request.toString());
    }

    /** Shopper submits the actual bill → compute refund of unused budget. */
    async setBill(requestId: string, userId: string, actualBillAmount: number) {
        const req: any = await this.repo.findById(requestId);
        if (!req) throw new Error("Request not found");
        if (req.shopper?._id?.toString() !== userId) throw new Error("Not the assigned shopper");
        if (typeof actualBillAmount !== "number" || actualBillAmount < 0) {
            throw new Error("Valid actualBillAmount required");
        }
        const refundAmount = round2(Math.max(0, (req.budget || 0) - actualBillAmount));
        await this.repo.updateById(requestId, {
            actualBillAmount,
            refundAmount,
            paymentStatus: refundAmount > 0 ? "partially_refunded" : "paid",
        });
        return { actualBillAmount, budget: req.budget, refundAmount };
    }

    /** Simple status/track for the customer. */
    async track(requestId: string, userId: string) {
        const req: any = await this.repo.findById(requestId);
        if (!req) throw new Error("Request not found");
        const owns = req.user?._id?.toString() === userId;
        const isShopper = req.shopper?._id?.toString() === userId;
        if (!owns && !isShopper) throw new Error("Request not found");
        return {
            requestId: req._id,
            status: req.status,
            paymentStatus: req.paymentStatus,
            budget: req.budget,
            actualBillAmount: req.actualBillAmount,
            refundAmount: req.refundAmount,
            shopper: req.shopper
                ? {
                      name: `${(req.shopper as any).firstName || ""} ${(req.shopper as any).lastName || ""}`.trim(),
                      mobileNumber: (req.shopper as any).mobileNumber,
                  }
                : null,
        };
    }

    /** Called by the payment flow after a request is paid → open it to shoppers. */
    async onPaid(requestId: string) {
        const req: any = await this.repo.updateById(requestId, {
            status: "finding_shopper",
        });
        const populated: any = await this.repo.findById(requestId);
        if (populated) emitRideRequest(this.shopperSummary(populated));
        return req;
    }
}
