import type { IProductContainer } from "../interfaces/productcontainer.interface.js";
import { ProductContainerModel } from "../models/productcontainer.model.js";

export class ProductContainerRepository {

    async create(data: Partial<IProductContainer>) {
        return ProductContainerModel.create(data);
    }

    async findAll() {
        return ProductContainerModel.find()
            .sort({ position: 1 });
    }

    async findById(id: string) {
        return ProductContainerModel.findById(id);
    }

    async update(
        id: string,
        data: Partial<IProductContainer>
    ) {
        return ProductContainerModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
    }

    async activate(id: string) {
        return ProductContainerModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }

    async deactivate(id: string) {
        return ProductContainerModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }
}