import { ProductContainerProductsRepository } from "../repositories/productcontainerproducts.repository.js";

export class ProductContainerProductsService {

    private repo =
        new ProductContainerProductsRepository();

    async getProducts(
        containerId: any,
        page: number,
        limit: number,
        search = ""
    ) {
        const skip = (page - 1) * limit;

        return this.repo.getProducts(
            containerId,
            skip,
            limit,
            search
        );
    }
}