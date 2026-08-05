import { OrderSummuryRepository } from "../repository/ordersummury.repository.js";

const round = (num: number) => Math.round(num * 100) / 100;

// Pick the single coupon to keep for a seller when more than one is in play.
// Prefer an applied coupon with the highest discount; if none qualify yet,
// keep the one closest to qualifying (smallest amountNeeded).
function chooseBetter(a: any, b: any) {
    if (a.applied && b.applied) {
        return b.discount > a.discount ? b : a;
    }

    if (a.applied) return a;
    if (b.applied) return b;

    return b.amountNeeded < a.amountNeeded ? b : a;
}

export class OrderSummuryService {
    private repo: OrderSummuryRepository;

    constructor() {
        this.repo = new OrderSummuryRepository();
    }

    async getOrderSummary(
        items: {
            productId: string;
            variantId?: string;
            qty: number;
            couponCode?: string;
        }[]
    ) {
        if (!items.length) {
            throw new Error("Items are required");
        }

        const productIds = items.map((i) => i.productId);

        const products = await this.repo.getProductsByIds(productIds);

        if (!products.length) {
            throw new Error("Products not found");
        }

        const productMap = new Map(
            products.map((product) => [
                product._id.toString(),
                product,
            ])
        );

        let subtotal = 0;

        const summaryItems: any[] = [];

        // ---------------------------------------------------------------
        // 1. Build priced line items
        // GST removed from products because product price already includes GST.
        // ---------------------------------------------------------------
        for (const item of items) {
            const qty = Number(item.qty);

            if (isNaN(qty) || qty <= 0) {
                throw new Error(
                    `Invalid quantity for product ${item.productId}`
                );
            }

            const product: any = productMap.get(item.productId);

            if (!product) {
                throw new Error(
                    `Product not found: ${item.productId}`
                );
            }

            let price = 0;
            let variant: any = null;

            if (item.variantId) {
                variant = product.variants?.find(
                    (v: any) =>
                        v._id.toString() === item.variantId
                );

                if (!variant) {
                    throw new Error(
                        `Variant not found: ${item.variantId}`
                    );
                }

                price = variant.price ?? product.mrp ?? 0;
            } else {
                price = product.mrp ?? 0;
            }

            const itemTotal = price * qty;

            subtotal += itemTotal;

            const productImage =
                product.images?.find(
                    (img: any) => img.isPrimary
                )?.url ||
                product.images?.[0]?.url ||
                "";

            const variantImage =
                variant?.images?.find(
                    (img: any) => img.isPrimary
                )?.url ||
                variant?.images?.[0]?.url;

            summaryItems.push({
                productId: product._id,
                vendorId: product.vendorId,
                name: product.name,
                slug: product.slug,

                images: [
                    {
                        url: variantImage || productImage,
                    },
                ],

                variant: variant
                    ? {
                        _id: variant._id,
                        price: variant.price,
                        unitValue: variant.unitValue,
                        stock: variant.stock,
                        attributes: variant.attributes,
                    }
                    : null,

                mrp: product.mrp,
                price,
                qty,

                couponCode: item.couponCode
                    ? String(item.couponCode)
                        .toUpperCase()
                        .trim()
                    : null,

                total: round(itemTotal),
            });
        }

        // ---------------------------------------------------------------
        // 2. Resolve coupons only against products of the coupon's seller
        // ---------------------------------------------------------------
        const groups = new Map<string, any[]>();

        for (const summaryItem of summaryItems) {
            if (!summaryItem.couponCode) continue;

            const key = `${summaryItem.couponCode}::${summaryItem.vendorId.toString()}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }

            groups.get(key)!.push(summaryItem);
        }

        const candidates: any[] = [];

        for (const [, groupItems] of groups) {
            const vendorId = groupItems[0].vendorId;
            const code = groupItems[0].couponCode;

            const coupon: any =
                await this.repo.getActiveCoupon(
                    code,
                    vendorId
                );

            // Coupon not found, inactive or not owned by this seller.
            if (!coupon) continue;

            const eligibleSubtotal = groupItems.reduce(
                (sum, item) => sum + item.total,
                0
            );

            const minOrderValue =
                coupon.minOrderValue ?? 0;

            let applied = false;
            let discount = 0;
            let amountNeeded = 0;

            if (eligibleSubtotal >= minOrderValue) {
                applied = true;

                if (
                    coupon.discountType === "PERCENTAGE"
                ) {
                    discount =
                        (eligibleSubtotal *
                            coupon.discountValue) /
                        100;
                } else {
                    discount = Math.min(
                        coupon.discountValue,
                        eligibleSubtotal
                    );
                }
            } else {
                amountNeeded =
                    minOrderValue - eligibleSubtotal;
            }

            candidates.push({
                couponCode: code,
                vendorId,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                minOrderValue,

                eligibleSubtotal: round(
                    eligibleSubtotal
                ),

                applied,
                discount: round(discount),
                amountNeeded: round(amountNeeded),
            });
        }

        // ---------------------------------------------------------------
        // 3. Enforce ONE coupon per seller
        // ---------------------------------------------------------------
        const perVendor = new Map<string, any>();

        for (const candidate of candidates) {
            const key = candidate.vendorId.toString();

            const existing = perVendor.get(key);

            perVendor.set(
                key,
                existing
                    ? chooseBetter(existing, candidate)
                    : candidate
            );
        }

        const coupons = [...perVendor.values()];

        // ---------------------------------------------------------------
        // Attach vendor/store name to coupons
        // ---------------------------------------------------------------
        if (coupons.length) {
            const profiles =
                await this.repo.getVendorStoreNames(
                    coupons.map(
                        (coupon) => coupon.vendorId
                    )
                );

            const nameMap = new Map(
                profiles.map((profile: any) => [
                    profile.user.toString(),
                    profile.storeName,
                ])
            );

            for (const coupon of coupons) {
                coupon.vendorName =
                    nameMap.get(
                        coupon.vendorId.toString()
                    ) ?? null;
            }
        }

        // ---------------------------------------------------------------
        // 4. Calculate discount
        // ---------------------------------------------------------------
        const totalDiscount = round(
            coupons
                .filter((coupon) => coupon.applied)
                .reduce(
                    (sum, coupon) =>
                        sum + coupon.discount,
                    0
                )
        );

        // ---------------------------------------------------------------
        // 5. Charges
        // Delivery charge is returned for UI display ONLY.
        // It is NOT added to the summary total.
        // ---------------------------------------------------------------
        const deliveryFee = 49;
        const platformFee = 7;

        const gstRate = 18;

        // GST is calculated only on platform fee.
        // Delivery fee is excluded from payable summary.
        const feeGst = round(
            (platformFee * gstRate) / 100
        );

        // ---------------------------------------------------------------
        // 6. Final payable amount
        // Delivery fee intentionally NOT included.
        // ---------------------------------------------------------------
        const totalAmount = round(
            subtotal -
            totalDiscount +
            platformFee +
            feeGst
        );

        const vendorId =
            summaryItems[0]?.vendorId || null;

        return {
            vendorId,

            items: summaryItems,

            coupons,

            subtotal: round(subtotal),

            totalDiscount,

            // Returned for UI/display purpose only.
            deliveryFee: round(deliveryFee),

            platformFee: round(platformFee),

            gstRate,

            feeGst,

            totalAmount,
        };
    }
}