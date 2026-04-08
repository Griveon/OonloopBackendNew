import type { IProductVideo } from "../interfaces/product.interface.js";
import { ProductVideoRepository } from "../repositories/productvideo.repository.js";

export class ProductVideoService {
    private repo: ProductVideoRepository;

    constructor() {
        this.repo = new ProductVideoRepository();
    }

    async upload(productId: string, urls: any[]) {

        const videos: IProductVideo[] = urls.map((vid: any, i) => ({
            url: vid.url,
            name: vid.name || "",
            alt: vid.alt || "",
            isPrimary: i === 0,
            position: i,
        }));

        return await this.repo.addVideos(productId, videos);
    }

    async getVideos(productId: string) {
        return await this.repo.findByProductId(productId);
    }

    async deleteVideo(productId: string, videoId: string) {
        return await this.repo.deleteVideo(productId, videoId);
    }
}