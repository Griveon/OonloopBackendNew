import { PreorderRepository } from "../repositories/preorder.repository.js";
import {
    PREORDER_CHARGES,
    PREORDER_DEFAULT_HORIZON_DAYS,
} from "../constants/preorder.constants.js";
import type { PreorderFulfillmentMode } from "../constants/preorder.constants.js";
import type {
    IPreorderOrderItem,
    IPreorderSlot,
} from "../interfaces/preorder.interface.js";
import {
    addDays,
    dateInRange,
    generatePreorderNumber,
    istDateStr,
    istMinutesNow,
    timeToMinutes,
} from "../utils/preorder.util.js";

const round2 = (n: number) => Math.round(n * 100) / 100;

interface ConfigInput {
    sameDay?: {
        enabled?: boolean;
        readyWithinHours?: number;
        cutoffTime?: string;
    };
    scheduled?: {
        enabled?: boolean;
        minLeadDays?: number;
        horizonDays?: number;
        slots?: IPreorderSlot[];
    };
    isActive?: boolean;
}

interface CreateOrderInput {
    items: { productId: string; variantId?: string; qty: number }[];
    fulfillmentMode: PreorderFulfillmentMode;
    // same_day: nothing extra needed
    // scheduled:
    scheduledDate?: string; // "YYYY-MM-DD"
    slotLabel?: string;
    delivery: {
        mobileNumber: string;
        location: { lat: number; lng: number };
        [k: string]: any;
    };
}

export class PreorderService {
    private repo = new PreorderRepository();

    // ==================================================================
    // Seller: config
    // ==================================================================

    /** Seller enables/updates preorder for one of their products. */
    async upsertConfig(vendorId: string, productId: string, input: ConfigInput) {
        if (!productId) throw new Error("productId is required");

        // Product must exist and belong to this seller.
        const [product] = await this.repo.getProductsByIds([productId]);
        if (!product) throw new Error("Product not found");
        if (product.vendorId?.toString() !== vendorId) {
            throw new Error("You can only configure your own products");
        }

        const sameDay = this.normalizeSameDay(input.sameDay);
        const scheduled = this.normalizeScheduled(input.scheduled);

        if (!sameDay.enabled && !scheduled.enabled) {
            throw new Error(
                "Enable at least one fulfilment mode (same-day or scheduled)"
            );
        }

        const data: any = { sameDay, scheduled };
        if (input.isActive !== undefined) data.isActive = input.isActive;

        return this.repo.upsertConfig(productId, vendorId, data);
    }

    private normalizeSameDay(sd?: ConfigInput["sameDay"]) {
        const enabled = !!sd?.enabled;
        if (!enabled) {
            return { enabled: false, readyWithinHours: 0, cutoffTime: "" };
        }
        const readyWithinHours = Number(sd?.readyWithinHours);
        if (!readyWithinHours || readyWithinHours <= 0) {
            throw new Error(
                "Same-day requires readyWithinHours greater than 0"
            );
        }
        const cutoffTime = sd?.cutoffTime || "";
        if (cutoffTime && timeToMinutes(cutoffTime) === null) {
            throw new Error("cutoffTime must be in HH:mm format");
        }
        return { enabled: true, readyWithinHours, cutoffTime };
    }

    private normalizeScheduled(sc?: ConfigInput["scheduled"]) {
        const enabled = !!sc?.enabled;
        if (!enabled) {
            return {
                enabled: false,
                minLeadDays: 0,
                horizonDays: PREORDER_DEFAULT_HORIZON_DAYS,
                slots: [],
            };
        }

        const minLeadDays = Number(sc?.minLeadDays ?? 0);
        const horizonDays = Number(
            sc?.horizonDays ?? PREORDER_DEFAULT_HORIZON_DAYS
        );

        if (minLeadDays < 0) throw new Error("minLeadDays cannot be negative");
        if (horizonDays < 1) throw new Error("horizonDays must be at least 1");
        if (horizonDays < minLeadDays) {
            throw new Error("horizonDays must be >= minLeadDays");
        }

        const rawSlots = Array.isArray(sc?.slots) ? sc!.slots! : [];
        if (!rawSlots.length) {
            throw new Error("Scheduled delivery requires at least one slot");
        }

        const slots = rawSlots.map((s) => {
            const label = String(s?.label || "").trim();
            const start = String(s?.start || "");
            const end = String(s?.end || "");
            if (!label) throw new Error("Each slot needs a label");
            const sm = timeToMinutes(start);
            const em = timeToMinutes(end);
            if (sm === null || em === null) {
                throw new Error("Slot start/end must be in HH:mm format");
            }
            if (sm >= em) {
                throw new Error(
                    `Slot "${label}" start must be before its end`
                );
            }
            return { label, start, end };
        });

        return { enabled: true, minLeadDays, horizonDays, slots };
    }

    async getMyConfigs(vendorId: string) {
        return this.repo.findConfigsByVendor(vendorId);
    }

    async setConfigActive(
        vendorId: string,
        productId: string,
        isActive: boolean
    ) {
        const updated = await this.repo.setConfigActive(
            productId,
            vendorId,
            isActive
        );
        if (!updated) throw new Error("Preorder config not found");
        return updated;
    }

    // ==================================================================
    // Customer: listing
    // ==================================================================

    async listProducts(params: {
        lat: number;
        lng: number;
        maxDistance?: number;
        page?: number;
        limit?: number;
        search?: string;
    }) {
        const { lat, lng } = params;
        if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
            throw new Error("lat and lng are required");
        }
        const page = params.page || 1;
        const limit = params.limit || 20;
        const maxDistance = params.maxDistance || 10000; // metres
        const skip = (page - 1) * limit;

        const { items, total } = await this.repo.findPreorderProducts(
            lat,
            lng,
            maxDistance,
            skip,
            limit,
            params.search
        );

        return { items, total, page, limit };
    }

    // ==================================================================
    // Customer: create order (status pending_payment; paid separately)
    // ==================================================================

    async createOrder(userId: string, input: CreateOrderInput) {
        if (!Array.isArray(input.items) || !input.items.length) {
            throw new Error("items are required");
        }
        if (!input.delivery?.mobileNumber || !input.delivery?.location) {
            throw new Error("delivery mobileNumber and location are required");
        }
        if (
            typeof input.delivery.location.lat !== "number" ||
            typeof input.delivery.location.lng !== "number"
        ) {
            throw new Error("delivery.location.lat/lng must be numbers");
        }

        const mode = input.fulfillmentMode;
        if (mode !== "same_day" && mode !== "scheduled") {
            throw new Error("fulfillmentMode must be same_day or scheduled");
        }

        // Load products + their configs.
        const productIds = input.items.map((i) => i.productId);
        const products = await this.repo.getProductsByIds(productIds);
        const productMap = new Map(
            products.map((p: any) => [p._id.toString(), p])
        );

        // One seller per preorder order.
        const vendorIds = new Set(
            products.map((p: any) => p.vendorId?.toString())
        );
        if (vendorIds.size !== 1) {
            throw new Error(
                "A preorder can contain items from only one seller"
            );
        }
        const vendorId = [...vendorIds][0]!;

        // Validate each product is preorderable + supports the chosen mode.
        const configs = await Promise.all(
            productIds.map((id) => this.repo.findActiveConfigByProduct(id))
        );

        let maxReadyHours = 0;
        let minCutoffMinutes: number | null = null;
        let maxMinLeadDays = 0;
        let minHorizonDays = PREORDER_DEFAULT_HORIZON_DAYS;
        let commonSlotLabels: Set<string> | null = null;

        for (let i = 0; i < productIds.length; i++) {
            const pid = productIds[i]!;
            const product: any = productMap.get(pid);
            if (!product) throw new Error(`Product not found: ${pid}`);

            const config: any = configs[i];
            if (!config) {
                throw new Error(
                    `Product "${product.name}" is not available for preorder`
                );
            }

            if (mode === "same_day") {
                if (!config.sameDay?.enabled) {
                    throw new Error(
                        `Product "${product.name}" is not available for same-day preorder`
                    );
                }
                maxReadyHours = Math.max(
                    maxReadyHours,
                    Number(config.sameDay.readyWithinHours || 0)
                );
                if (config.sameDay.cutoffTime) {
                    const c = timeToMinutes(config.sameDay.cutoffTime);
                    if (c !== null) {
                        minCutoffMinutes =
                            minCutoffMinutes === null
                                ? c
                                : Math.min(minCutoffMinutes, c);
                    }
                }
            } else {
                if (!config.scheduled?.enabled) {
                    throw new Error(
                        `Product "${product.name}" is not available for scheduled preorder`
                    );
                }
                maxMinLeadDays = Math.max(
                    maxMinLeadDays,
                    Number(config.scheduled.minLeadDays || 0)
                );
                minHorizonDays = Math.min(
                    minHorizonDays,
                    Number(
                        config.scheduled.horizonDays ??
                            PREORDER_DEFAULT_HORIZON_DAYS
                    )
                );
                const labels = new Set<string>(
                    (config.scheduled.slots || []).map((s: any) =>
                        String(s.label)
                    )
                );
                if (commonSlotLabels === null) {
                    commonSlotLabels = labels;
                } else {
                    const prev: Set<string> = commonSlotLabels;
                    commonSlotLabels = new Set<string>(
                        [...labels].filter((l) => prev.has(l))
                    );
                }
            }
        }

        // Build priced line items.
        const items: IPreorderOrderItem[] = [];
        let subtotal = 0;

        for (const raw of input.items) {
            const qty = Number(raw.qty);
            if (isNaN(qty) || qty <= 0) {
                throw new Error(`Invalid quantity for ${raw.productId}`);
            }
            const product: any = productMap.get(raw.productId);

            let price = Number(product.mrp || 0);
            let variantId: any;
            let variantLabel = "";

            if (raw.variantId) {
                const variant = (product.variants || []).find(
                    (v: any) => v._id.toString() === raw.variantId
                );
                if (!variant) {
                    throw new Error(`Variant not found: ${raw.variantId}`);
                }
                price = Number(variant.price ?? product.mrp ?? 0);
                variantId = variant._id;
                variantLabel = this.variantLabel(variant);
            }

            const total = round2(price * qty);
            subtotal += total;

            const image =
                product.images?.find((im: any) => im.isPrimary)?.url ||
                product.images?.[0]?.url ||
                "";

            const item: IPreorderOrderItem = {
                product: product._id,
                name: product.name,
                image,
                price,
                qty,
                total,
            };
            if (variantId) item.variantId = variantId;
            if (variantLabel) item.variantLabel = variantLabel;
            items.push(item);
        }

        // Fulfilment window.
        const orderDoc: any = {
            user: userId,
            vendor: vendorId,
            items,
            fulfillmentMode: mode,
            delivery: input.delivery,
            status: "pending_payment",
            paymentStatus: "pending",
        };

        if (mode === "same_day") {
            // Enforce same-day cutoff (auto-accept validity check).
            if (
                minCutoffMinutes !== null &&
                istMinutesNow() > minCutoffMinutes
            ) {
                throw new Error(
                    "Same-day ordering is closed for today. Please choose scheduled delivery."
                );
            }
            const promisedReadyAt = new Date(
                Date.now() + maxReadyHours * 60 * 60 * 1000
            );
            orderDoc.sameDay = {
                readyWithinHours: maxReadyHours,
                promisedReadyAt,
            };
        } else {
            const date = String(input.scheduledDate || "");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                throw new Error("scheduledDate (YYYY-MM-DD) is required");
            }
            const today = istDateStr();
            const minDate = addDays(today, maxMinLeadDays);
            const maxDate = addDays(today, minHorizonDays);
            if (!dateInRange(date, minDate, maxDate)) {
                throw new Error(
                    `Scheduled date must be between ${minDate} and ${maxDate}`
                );
            }

            const label = String(input.slotLabel || "");
            if (!label) throw new Error("slotLabel is required");
            if (!commonSlotLabels || !commonSlotLabels.has(label)) {
                throw new Error(
                    "Selected slot is not available for all items in this order"
                );
            }

            // Resolve slot times from the first product's config.
            const firstConfig: any = configs[0];
            const slot = (firstConfig.scheduled.slots || []).find(
                (s: any) => s.label === label
            );
            if (!slot) throw new Error("Slot not found");

            orderDoc.scheduled = {
                date: new Date(`${date}T00:00:00+05:30`),
                slotLabel: slot.label,
                slotStart: slot.start,
                slotEnd: slot.end,
            };
        }

        // Charges (mirror normal order summary).
        const platformFee = PREORDER_CHARGES.PLATFORM_FEE;
        const feeGst = round2(
            (platformFee * PREORDER_CHARGES.GST_RATE) / 100
        );
        orderDoc.subtotal = round2(subtotal);
        orderDoc.platformFee = platformFee;
        orderDoc.feeGst = feeGst;
        orderDoc.deliveryFee = PREORDER_CHARGES.DELIVERY_FEE; // display only
        orderDoc.totalAmount = round2(subtotal + platformFee + feeGst);

        orderDoc.orderNumber = await generatePreorderNumber();
        orderDoc.trackingHistory = [
            {
                title: "Preorder created",
                status: "pending_payment",
                remark: "Awaiting payment",
                updatedByRole: "system",
                updatedAt: new Date(),
            },
        ];

        return this.repo.createOrder(orderDoc);
    }

    private variantLabel(variant: any): string {
        const attrs = variant.attributes;
        if (!attrs) return "";
        const entries =
            typeof attrs.entries === "function"
                ? [...attrs.entries()]
                : Object.entries(attrs);
        return entries.map(([, v]) => String(v)).join(" / ");
    }

    // ==================================================================
    // Customer: read
    // ==================================================================

    async getMyOrders(userId: string, page = 1, limit = 10, status?: string) {
        return this.repo.findByUser(userId, page, limit, status);
    }

    async getById(id: string, userId: string) {
        const order: any = await this.repo.findOrderById(id);
        if (!order) throw new Error("Preorder not found");
        if (!this.canAccess(order, userId)) throw new Error("Preorder not found");
        return order;
    }

    private canAccess(order: any, userId: string): boolean {
        const uid = (v: any) =>
            v?._id ? v._id.toString() : v?.toString();
        return (
            uid(order.user) === userId ||
            uid(order.vendor) === userId ||
            uid(order.driver) === userId
        );
    }

    async cancel(id: string, userId: string) {
        const order: any = await this.repo.findOrderById(id);
        if (!order) throw new Error("Preorder not found");
        const ownerId = order.user?._id
            ? order.user._id.toString()
            : order.user?.toString();
        if (ownerId !== userId) throw new Error("Preorder not found");

        if (["delivered", "cancelled"].includes(order.status)) {
            throw new Error(`Cannot cancel a ${order.status} preorder`);
        }
        if (["ready", "out_for_delivery"].includes(order.status)) {
            throw new Error(
                "This preorder is already being prepared for delivery and cannot be cancelled"
            );
        }

        return this.repo.pushTrackingAndSet(
            id,
            { status: "cancelled", cancelledAt: new Date() },
            {
                title: "Preorder cancelled",
                status: "cancelled",
                remark: "Cancelled by customer",
                updatedByRole: "customer",
                updatedAt: new Date(),
            }
        );
    }

    // ==================================================================
    // Seller: incoming queue + status updates
    // ==================================================================

    async getVendorOrders(
        vendorId: string,
        page = 1,
        limit = 10,
        status?: string
    ) {
        return this.repo.findByVendor(vendorId, page, limit, status);
    }

    async updateStatus(
        vendorId: string,
        orderId: string,
        nextStatus: string
    ) {
        const order: any = await this.repo.findOrderById(orderId);
        if (!order) throw new Error("Preorder not found");

        const vId = order.vendor?._id
            ? order.vendor._id.toString()
            : order.vendor?.toString();
        if (vId !== vendorId) throw new Error("Preorder not found");

        if (order.paymentStatus !== "success") {
            throw new Error("Preorder is not paid yet");
        }

        const transitions: Record<string, string[]> = {
            placed: ["preparing", "cancelled"],
            preparing: ["ready", "cancelled"],
            ready: ["out_for_delivery"],
            out_for_delivery: ["delivered"],
        };

        const allowed = transitions[order.status] || [];
        if (!allowed.includes(nextStatus)) {
            throw new Error(
                `Cannot move a "${order.status}" preorder to "${nextStatus}"`
            );
        }

        const set: Record<string, any> = { status: nextStatus };
        if (nextStatus === "ready") set.readyAt = new Date();
        if (nextStatus === "delivered") set.deliveredAt = new Date();
        if (nextStatus === "cancelled") set.cancelledAt = new Date();

        return this.repo.pushTrackingAndSet(orderId, set, {
            title: `Preorder ${nextStatus}`,
            status: nextStatus,
            remark: `Updated by seller`,
            updatedByRole: "vendor",
            updatedAt: new Date(),
        });
    }
}
