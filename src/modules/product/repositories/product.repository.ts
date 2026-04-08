import { ProductModel } from "../models/product.model.js";
import type { IProduct } from "../interfaces/product.interface.js";

export class ProductRepository {
    async create(data: IProduct) {
        return await ProductModel.create(data);
    }

    async findById(id: string) {
        return await ProductModel.findById(id);
    }

    async findAll(filter: any = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            ProductModel.find(filter).skip(skip).limit(limit),
            ProductModel.countDocuments(filter)
        ]);
        return { items, total };
    }

    async update(id: string, data: Partial<IProduct>) {
        return await ProductModel.findByIdAndUpdate(id, data, { new: true });
    }

    async delete(id: string) {
        return await ProductModel.findByIdAndDelete(id);
    }
}