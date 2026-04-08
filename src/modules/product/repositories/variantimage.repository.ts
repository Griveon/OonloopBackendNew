import { ProductModel } from "../models/product.model.js";

export class VariantImageRepository {

    // ✅ Add images
    async addImages(productId: string, variantObjectId: string, urls: string[]) {
        const product = await ProductModel.findById(productId);
        if (!product) throw new Error("Product not found");

        const variant = product.variants?.find(
            (v: any) => v._id.toString() === variantObjectId
        );

        console.log(variantObjectId)

        if (!variant) throw new Error("Variant not found");

        const startPos = variant.images?.length || 0;

        const newImages = urls.map((img: any, i) => ({
            url: img.url,          // ✅ FIXED
            name: img.name || "",
            alt: img.alt || "",
            isPrimary: startPos === 0 && i === 0,
            position: startPos + i,
        }));

        variant.images = variant.images
            ? [...variant.images, ...newImages]
            : newImages;

        await product.save();
        return variant.images;
    }

    // ✅ Get images of a variant (FIXED)
    async findByVariant(productId: string, variantObjectId: string) {
        const product = await ProductModel.findById(productId, "variants");
        if (!product) throw new Error("Product not found");

        const variant = product.variants?.find(
            (v: any) => v._id.toString() === variantObjectId
        );

        if (!variant) throw new Error("Variant not found");

        return variant.images || [];
    }

    // ✅ Delete image (FIXED)
    async deleteImage(productId: string, variantObjectId: string, imageId: string) {
        const product = await ProductModel.findById(productId);
        if (!product) throw new Error("Product not found");

        const variant: any = product.variants?.find(
            (v: any) => v._id.toString() === variantObjectId
        );

        if (!variant) throw new Error("Variant not found");

        const idx = variant.images.findIndex(
            (img: any) =>
                img._id?.toString() === imageId || img.url === imageId
        );

        if (idx === -1) throw new Error("Image not found");

        const removed = variant.images.splice(idx, 1)[0];

        // ✅ Fix primary image if deleted
        if (removed.isPrimary && variant.images.length > 0) {
            variant.images[0].isPrimary = true;
        }

        // ✅ Recalculate positions
        variant.images.forEach((img: any, index: number) => {
            img.position = index;
        });

        await product.save();
        return removed;
    }
}