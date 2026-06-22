import { ProductContainerRepository } from "../repositories/productcontainer.repository.js";

export class ProductContainerService {

    private repo =
        new ProductContainerRepository();

    async create(data: any) {
        return this.repo.create(data);
    }

    async getAll() {
        return this.repo.findAll();
    }

    async getById(id: any) {

        const item =
            await this.repo.findById(id);

        if (!item) {
            throw new Error(
                "Container not found"
            );
        }

        return item;
    }

    async update(
        id: any,
        data: any
    ) {

        const item =
            await this.repo.findById(id);

        if (!item) {
            throw new Error(
                "Container not found"
            );
        }

        return this.repo.update(
            id,
            data
        );
    }

    async activate(id: any) {

        const item =
            await this.repo.findById(id);

        if (!item) {
            throw new Error(
                "Container not found"
            );
        }

        return this.repo.activate(id);
    }

    async deactivate(id: any) {

        const item =
            await this.repo.findById(id);

        if (!item) {
            throw new Error(
                "Container not found"
            );
        }

        return this.repo.deactivate(id);
    }
}