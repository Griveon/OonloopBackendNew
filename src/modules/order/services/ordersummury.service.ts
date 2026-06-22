import { OrderSummuryRepository } from "../repository/ordersummury.repository.js";

export class OrderSummuryService {
    private repo: OrderSummuryRepository;

    constructor() {
        this.repo = new OrderSummuryRepository();
    }

    async getOrderSummary(items: { productId: string; variantId?: string; qty: number }[]
    ) {

        if (!items.length) throw new Error("Items are required");

        const productIds = items.map(i => i.productId);
        const products = await this.repo.getProductsByIds(productIds);

        if (!products.length) throw new Error("Products not found");

        const productMap = new Map(
            products.map(p => [p._id.toString(), p])
        );

        let subtotal = 0;
        let gstTotal = 0;

        const summaryItems: any[] = [];

        for (const item of items) {
            const qty = Number(item.qty);

            if (isNaN(qty) || qty <= 0) {
                throw new Error(`Invalid quantity for product ${item.productId}`);
            }

            const product: any = productMap.get(item.productId);

            if (!product) {
                throw new Error(`Product not found: ${item.productId}`);
            }

            let price = 0;
            let variant: any = null;

            if (item.variantId) {
                variant = product.variants?.find(
                    (v: any) => v._id.toString() === item.variantId
                );

                if (!variant) {
                    throw new Error(`Variant not found: ${item.variantId}`);
                }

                price = variant.price ?? product.mrp ?? 0;
            } else {
                price = product.mrp ?? 0;
            }

            const itemTotal = price * qty;
            subtotal += itemTotal;

            // GST
            const gstPercent = product.gst?.gstPercent ?? 0;

            let gstAmount = 0;
            if (product.gst?.priceIncludingGST) {
                gstAmount = itemTotal - (itemTotal * 100) / (100 + gstPercent);
            } else {
                gstAmount = (itemTotal * gstPercent) / 100;
            }

            gstTotal += gstAmount;

            // ✅ IMAGE (use primary if available)
            const productImage =
                product.images?.find((img: any) => img.isPrimary)?.url ||
                product.images?.[0]?.url ||
                "";

            const variantImage =
                variant?.images?.find((img: any) => img.isPrimary)?.url ||
                variant?.images?.[0]?.url;

            // ✅ PUSH STRUCTURED ITEM (MATCHING YOUR MODEL STYLE)
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
                qty,
                total: Math.round(itemTotal * 100) / 100,
            });
        }

        const serviceFee = 49;


        const deliveryCharge = subtotal > 500 ? 0 : 50;

        const totalAmount = subtotal + serviceFee

        const round = (num: number) => Math.round(num * 100) / 100;

        const vendorId = summaryItems[0]?.vendorId || null;
        console

        return {
            vendorId,
            subtotal: round(subtotal),
            gstTotal: round(gstTotal),
            platformFee: round(serviceFee),
            deliveryCharge: round(deliveryCharge),
            totalAmount: round(totalAmount),
            items: summaryItems,
        };
    }

}