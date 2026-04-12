import { CartRepository } from "../repositories/cart.repository.js";
import { ProductModel } from "../../product/models/product.model.js";

export class CartService {
    private repo: CartRepository;

    constructor() {
        this.repo = new CartRepository();
    }

    /* 🔥 Get or Create Cart */
    async getCart(userId: string) {
        let cart = await this.repo.findByUser(userId);

        if (!cart) {
            cart = await this.repo.create(userId);
        }

        return cart;
    }

    /* 🔥 Add to Cart */
    async addToCart(userId: string, data: any) {
        const { productId, variantId, quantity = 1 } = data;

        let cart = await this.repo.findByUser(userId);
        if (!cart) cart = await this.repo.create(userId);

        const product: any = await ProductModel.findById(productId);
        if (!product) throw new Error("Product not found");

        let price = product.mrp;
        let name = product.name;
        let image = product.images?.[0]?.url;

        if (variantId) {
            const variant = product.variants.id(variantId);
            if (!variant) throw new Error("Variant not found");

            price = variant.price || price;
            image = variant.images?.[0]?.url || image;
        }

        const existingItem = cart.items.find(
            (i: any) =>
                i.product.toString() === productId &&
                i.variant?.toString() === variantId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.total = existingItem.price * existingItem.quantity;
        } else {
            cart.items.push({
                product: productId,
                variant: variantId,
                quantity,
                price,
                name,
                image,
                total: price * quantity,
                gstPercent: product.gst?.gstPercent || 0,
                gstAmount: product.gst?.gstAmount || 0,
            });
        }

        return await this.repo.save(cart);
    }

    /* 🔥 Update Quantity */
    async updateQuantity(userId: string, itemId: string, quantity: number) {
        const cart = await this.repo.findByUser(userId);
        if (!cart) throw new Error("Cart not found");

        const item = cart.items.find(
            (i: any) => i._id.toString() === itemId
        );

        if (!item) throw new Error("Item not found");

        item.quantity = quantity;
        item.total = item.price * quantity;

        return await this.repo.save(cart);
    }

    /* 🔥 Remove Item */
    async removeItem(userId: string, itemId: string) {
        const cart = await this.repo.findByUser(userId);
        if (!cart) throw new Error("Cart not found");

        cart.items = cart.items.filter(
            (i: any) => i._id.toString() !== itemId
        );

        return await this.repo.save(cart);
    }

    /* 🔥 Clear Cart */
    async clearCart(userId: string) {
        return await this.repo.clear(userId);
    }
}