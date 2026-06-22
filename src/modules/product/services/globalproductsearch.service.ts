import { ProductSearchRepository } from "../repositories/globalproductsearch.repository.js";

export class ProductSearchService {

    private repository = new ProductSearchRepository();

    async SearchProducts(
        keyword: string,
        page: number,
        limit: number
    ) {
        return await this.repository.SearchProducts(
            keyword,
            page,
            limit
        );
    }
}