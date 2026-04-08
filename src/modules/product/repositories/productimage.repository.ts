import { ProductModel } from "../models/product.model.js";
import type { IProductImage } from "../interfaces/product.interface.js";

export class ProductImageRepository {

    async addImages(productId: string, images: IProductImage[]) {
        return await ProductModel.findByIdAndUpdate(
            productId,
            { $push: { images: { $each: images } } },
            { new: true }
        );
    }

    async findByProductId(productId: string) {
        const product = await ProductModel.findById(productId, "images");
        return product?.images || [];
    }

    async deleteImage(productId: string, imageId: string) {

        const product = await ProductModel.findById(productId);
        if (!product) throw new Error("Product not found");

        const index = product.images.findIndex((img: any) => img._id?.toString() === imageId || img.url === imageId);
        if (index === -1) throw new Error("Image not found");

        const removed = product.images.splice(index, 1);
        await product.save();
        return removed[0];
    }
}