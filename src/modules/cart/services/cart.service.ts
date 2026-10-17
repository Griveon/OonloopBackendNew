import mongoose from "mongoose";
import { CartRepository } from "../repositories/cart.repository.js";
import { ProductModel } from "../../product/models/product.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";

const MAX_CART_WRITE_ATTEMPTS = 5;

interface ResolvedProductSelection {
    product: any;
    variant: any | null;
    price: number;
    mrp: number;
    image: string | undefined;
    stock: number;
}

export class CartService {
    private repo: CartRepository;

    constructor() {
        this.repo = new CartRepository();
    }

    private assertPositiveInteger(quantity: number) {
        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error("Quantity must be a positive integer");
        }
    }

    private isProductAvailable(product: any): boolean {
        if (product.isActive === false) return false;
        if (!product.availability || product.availability.type !== "scheduled") return true;

        const nowInIndia = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );
        const currentMinutes = nowInIndia.getHours() * 60 + nowInIndia.getMinutes();
        const from = Number(product.availability.fromMinutes);
        const to = Number(product.availability.toMinutes);
        if (!Number.isFinite(from) || !Number.isFinite(to)) return false;

        return from <= to
            ? currentMinutes >= from && currentMinutes <= to
            : currentMinutes >= from || currentMinutes <= to;
    }

    private async resolveSelection(
        productId: string,
        variantId?: string | null
    ): Promise<ResolvedProductSelection> {
        if (!mongoose.isValidObjectId(productId)) throw new Error("Invalid product ID");
        if (variantId && !mongoose.isValidObjectId(variantId)) throw new Error("Invalid variant ID");

        const query: any = ProductModel.findById(productId);
        const product: any = typeof query?.select === "function"
            ? await query.select("name price customerSellingPrice mrp stock isActive availability gst variants images")
            : await query;
        if (!product) throw new Error("Product not found");
        if (!this.isProductAvailable(product)) throw new Error("Product is not currently available");

        const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
        let variant: any | null = null;
        if (variantId) {
            // Product-scoped lookup is required because legacy products can share a variant id.
            variant = product.variants?.id(variantId) || null;
            if (!variant) throw new Error("Variant not found for this product");
        } else if (hasVariants) {
            throw new Error("Variant ID is required for this product");
        }

        const price = Number(
            variant
                ? variant.customerSellingPrice ?? variant.price ?? product.customerSellingPrice ?? product.price ?? variant.mrp ?? product.mrp
                : product.customerSellingPrice ?? product.price ?? product.mrp
        );
        const mrp = Number(variant?.mrp ?? product.mrp ?? price);
        const stock = Number(variant ? variant.stock ?? 0 : product.stock ?? 0);

        if (!Number.isFinite(price) || price < 0) throw new Error("Invalid product selling price");
        if (Number.isFinite(mrp) && mrp > 0 && price > mrp) {
            throw new Error("Customer selling price cannot exceed MRP");
        }
        if (!Number.isFinite(stock) || stock < 0) throw new Error("Invalid product stock");

        return {
            product,
            variant,
            price,
            mrp: Number.isFinite(mrp) && mrp >= 0 ? mrp : price,
            image: variant?.images?.[0]?.url || product.images?.[0]?.url,
            stock,
        };
    }

    private isSameLine(item: any, productId: string, variantId?: string | null) {
        return item.product.toString() === productId &&
            (item.variant?.toString() || undefined) === (variantId || undefined);
    }

    private applyCurrentPricing(item: any, selection: ResolvedProductSelection) {
        item.price = selection.price;
        item.customerSellingPrice = selection.price;
        item.mrp = selection.mrp;
        item.name = selection.product.name;
        item.image = selection.image;
        item.gstPercent = Number(selection.product.gst?.gstPercent || 0);
        // gstAmount is a unit amount; the model multiplies it by quantity.
        item.gstAmount = Number(selection.product.gst?.gstAmount || 0);
        item.total = selection.price * item.quantity;
    }

    private async saveWithRetry<T>(
        userId: string,
        mutate: (cart: any) => T | Promise<T>
    ): Promise<T> {
        for (let attempt = 1; attempt <= MAX_CART_WRITE_ATTEMPTS; attempt++) {
            const cart = await this.repo.findOrCreate(userId);
            try {
                const result = await mutate(cart);
                await this.repo.save(cart);
                return result;
            } catch (error) {
                if (error instanceof mongoose.Error.VersionError && attempt < MAX_CART_WRITE_ATTEMPTS) {
                    continue;
                }
                throw error;
            }
        }

        throw new Error("Cart was updated concurrently; please retry");
    }

    async getCart(userId: string) {
        const cart = await this.repo.findOrCreate(userId);
        await cart.populate({
            path: "items.product",
            model: "Product",
            select: "name vendorId images category productCategory price customerSellingPrice mrp stock isActive availability",
        });

        const vendorUserIds = [
            ...new Set(
                cart.items
                    .map((item: any) => item.product?.vendorId?.toString())
                    .filter(Boolean)
            ),
        ];

        const vendors = await VendorProfileModel.find({ user: { $in: vendorUserIds } })
            .select("user storeName storeLogo isVerified profileStatus storeLocationAddress")
            .lean();
        const vendorMap = new Map(
            vendors.map((vendor) => [
                vendor.user.toString(),
                {
                    _id: vendor._id,
                    storeName: vendor.storeName,
                    storeLogo: vendor.storeLogo,
                    isVerified: vendor.isVerified,
                    profileStatus: vendor.profileStatus,
                    storeLocationAddress: vendor.storeLocationAddress,
                },
            ])
        );

        const items = cart.items.map((item: any) => {
            const product = item.product;
            return {
                ...item.toObject(),
                vendor: product?.vendorId
                    ? vendorMap.get(product.vendorId.toString()) || null
                    : null,
            };
        });

        return { ...cart.toObject(), items };
    }

    async addToCart(userId: string, data: any) {
        const { productId, variantId, quantity = 1 } = data;
        this.assertPositiveInteger(quantity);
        const selection = await this.resolveSelection(productId, variantId);

        return this.saveWithRetry(userId, (cart) => {
            const existingItem = cart.items.find((item: any) =>
                this.isSameLine(item, productId, variantId)
            );
            const resultingQuantity = Number(existingItem?.quantity || 0) + quantity;
            if (resultingQuantity > selection.stock) throw new Error("Insufficient stock");

            if (existingItem) {
                existingItem.quantity = resultingQuantity;
                this.applyCurrentPricing(existingItem, selection);
                return existingItem;
            }

            cart.items.push({
                product: productId,
                ...(variantId ? { variant: variantId } : {}),
                quantity,
                price: selection.price,
                customerSellingPrice: selection.price,
                mrp: selection.mrp,
                name: selection.product.name,
                image: selection.image,
                total: selection.price * quantity,
                gstPercent: Number(selection.product.gst?.gstPercent || 0),
                gstAmount: Number(selection.product.gst?.gstAmount || 0),
            });

            return cart.items[cart.items.length - 1];
        });
    }

    async updateQuantity(userId: string, itemId: string, quantity: number) {
        this.assertPositiveInteger(quantity);
        if (!mongoose.isValidObjectId(itemId)) throw new Error("Invalid cart item ID");

        return this.saveWithRetry(userId, async (cart) => {
            const item = cart.items.find((candidate: any) => candidate._id.toString() === itemId);
            if (!item) throw new Error("Item not found");

            const selection = await this.resolveSelection(
                item.product.toString(),
                item.variant?.toString()
            );
            if (quantity > selection.stock) throw new Error("Insufficient stock");

            item.quantity = quantity;
            this.applyCurrentPricing(item, selection);
            return item;
        });
    }

    async removeItem(userId: string, itemId: string) {
        if (!mongoose.isValidObjectId(itemId)) throw new Error("Invalid cart item ID");

        return this.saveWithRetry(userId, (cart) => {
            const originalLength = cart.items.length;
            cart.items = cart.items.filter((item: any) => item._id.toString() !== itemId);
            if (cart.items.length === originalLength) throw new Error("Item not found");
            return cart;
        });
    }

    async clearCart(userId: string) {
        return this.saveWithRetry(userId, (cart) => {
            cart.items = [];
            return cart;
        });
    }
}
