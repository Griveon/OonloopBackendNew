import { ProductViewRepository } from "../repositories/productview.repository.js";

export class ProductViewService {

    private repo =
        new ProductViewRepository();

    async addView(
        userId: any,
        productId: any
    ) {

        const result =
            await this.repo.addView(
                userId,
                productId
            );

        await this.repo.deleteOldViews(
            userId,
            50
        );

        return result;
    }

    async getRecentlyViewed(
        userId: any,
        limit: number
    ) {

        return this.repo.getRecentlyViewed(
            userId,
            limit
        );
    }
}