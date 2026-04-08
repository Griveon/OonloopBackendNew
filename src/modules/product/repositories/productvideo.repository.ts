import { ProductModel } from "../models/product.model.js";
import type { IProductVideo } from "../interfaces/product.interface.js";

export class ProductVideoRepository {

    async addVideos(productId: string, videos: IProductVideo[]) {
        return await ProductModel.findByIdAndUpdate(
            productId,
            { $push: { videos: { $each: videos } } },
            { new: true }
        );
    }

    async findByProductId(productId: string) {
        const product = await ProductModel.findById(productId, "videos");
        return product?.videos || [];
    }

    async deleteVideo(productId: string, videoId: string) {

        const product = await ProductModel.findById(productId);
        if (!product) throw new Error("Product not found");

        const index = product.videos.findIndex(
            (vid: any) =>
                vid._id?.toString() === videoId || vid.url === videoId
        );

        if (index === -1) throw new Error("Video not found");

        const removed = product.videos.splice(index, 1);
        await product.save();

        return removed[0];
    }
}