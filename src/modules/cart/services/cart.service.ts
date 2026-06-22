import { CartRepository } from "../repositories/cart.repository.js";
import { ProductModel } from "../../product/models/product.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";

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

        // Populate product details
        await cart.populate({
            path: "items.product",
            model: "Product",
        });

        // Get unique vendor ids
        const vendorUserIds = [
            ...new Set(
                cart.items
                    .map((item: any) => item.product?.vendorId?.toString())
                    .filter(Boolean)
            ),
        ];

        // Fetch all vendors in one query
        const vendors = await VendorProfileModel.find({
            user: { $in: vendorUserIds },
        }).lean();

        // Create lookup map
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

        // Attach vendor details to each item
        const items = cart.items.map((item: any) => {
            const product = item.product;

            return {
                ...item.toObject(),
                vendor: product?.vendorId
                    ? vendorMap.get(product.vendorId.toString()) || null
                    : null,
            };
        });

        return {
            ...cart.toObject(),
            items,
        };
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

        let cartItem: any;

        const existingItem = cart.items.find(
            (i: any) =>
                i.product.toString() === productId &&
                i.variant?.toString() === variantId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.total = existingItem.price * existingItem.quantity;
            cartItem = existingItem;
        } else {
            cartItem = {
                product: productId,
                variant: variantId,
                quantity,
                price,
                name,
                image,
                total: price * quantity,
                gstPercent: product.gst?.gstPercent || 0,
                gstAmount: product.gst?.gstAmount || 0,
            };

            cart.items.push(cartItem);
        }

        await cart.save();

        const savedItem = cart.items.find(
            (i: any) =>
                i.product.toString() === productId &&
                i.variant?.toString() === variantId
        );

        return savedItem;
    }

    /* 🔥 Update Quantity */
    async updateQuantity(
        userId: string,
        itemId: string,
        quantity: number
    ) {
        const cart = await this.repo.findByUser(userId);

        if (!cart) {
            throw new Error("Cart not found");
        }

        const item = cart.items.find(
            (i: any) => i._id.toString() === itemId
        );

        if (!item) {
            throw new Error("Item not found");
        }

        item.quantity = quantity;
        item.total = item.price * quantity;

        await this.repo.save(cart);

        const updatedItem = cart.items.find(
            (i: any) => i._id.toString() === itemId
        );

        return updatedItem;
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