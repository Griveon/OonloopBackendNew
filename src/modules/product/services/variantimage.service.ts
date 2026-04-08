import { VariantImageRepository } from "../repositories/variantimage.repository.js";

export class VariantImageService {
    private repo: VariantImageRepository;

    constructor() {
        this.repo = new VariantImageRepository();
    }

    async upload(productId: string, variantId: any, urls: string[]) {
        if (urls.length === 0) throw new Error("No images provided");
        return await this.repo.addImages(productId, variantId, urls);
    }

    async getImages(productId: string, variantId: any) {
        return await this.repo.findByVariant(productId, variantId);
    }

    async deleteImage(productId: string, variantId: any, imageIdOrUrl: string) {
        return await this.repo.deleteImage(productId, variantId, imageIdOrUrl);
    }
}