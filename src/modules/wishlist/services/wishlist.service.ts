import { WishlistRepository } from "../repositories/wishlist.repository.js";
import { ProductModel } from "../../product/models/product.model.js";

export class WishlistService {
    private repo: WishlistRepository;

    constructor() {
        this.repo = new WishlistRepository();
    }

    /* 🔥 Get or Create Wishlist */
    async getWishlist(userId: string) {
        let wishlist = await this.repo.findByUser(userId);

        if (!wishlist) {
            wishlist = await this.repo.create(userId);
        }

        return wishlist;
    }

    /* 🔥 Add to Wishlist */
    async add(userId: string, data: any) {
        const { productId, variantId } = data;

        let wishlist = await this.repo.findByUser(userId);
        if (!wishlist) wishlist = await this.repo.create(userId);

        const product: any = await ProductModel.findById(productId);
        if (!product) throw new Error("Product not found");

        let name = product.name;
        let image = product.images?.[0]?.url;
        let price = product.mrp;

        if (variantId) {
            const variant = product.variants.id(variantId);
            if (!variant) throw new Error("Variant not found");

            image = variant.images?.[0]?.url || image;
            price = variant.price || price;
        }

        const exists = wishlist.items.find(
            (i: any) =>
                i.product.toString() === productId &&
                i.variant?.toString() === variantId
        );

        if (exists) {
            throw new Error("Item already in wishlist");
        }

        wishlist.items.push({
            product: productId,
            variant: variantId,
            name,
            image,
            price,
        });

        return await this.repo.save(wishlist);
    }

    /* 🔥 Remove Item */
    async remove(userId: string, itemId: string) {
        const wishlist = await this.repo.findByUser(userId);
        if (!wishlist) throw new Error("Wishlist not found");

        wishlist.items = wishlist.items.filter(
            (i: any) => i._id.toString() !== itemId
        );

        return await this.repo.save(wishlist);
    }

    /* 🔥 Clear Wishlist */
    async clear(userId: string) {
        return await this.repo.clear(userId);
    }
}