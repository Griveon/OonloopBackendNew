import type { IProductImage } from "../interfaces/product.interface.js";
import { ProductImageRepository } from "../repositories/productimage.repository.js";

export class ProductImageService {
    private repo: ProductImageRepository;

    constructor() {
        this.repo = new ProductImageRepository();
    }

    async upload(productId: string, urls: string[]) {

        const images: IProductImage[] = urls.map((img: any, i) => ({
            url: img.url,       
            name: img.name || "",
            alt: img.alt || "",
            isPrimary: i === 0,
            position: i,
        }));

        return await this.repo.addImages(productId, images);
    }

    async getImages(productId: string) {
        return await this.repo.findByProductId(productId);
    }

    async deleteImage(productId: string, imageId: string) {
        return await this.repo.deleteImage(productId, imageId);
    }
}