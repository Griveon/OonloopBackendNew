import { FeatureModel } from "../models/feature.model.js";
import type { IFeature } from "../interfaces/feature.interface.js";

export class FeatureRepository {

    async createFeature(data: Partial<IFeature>) {
        return await FeatureModel.create(data);
    }

    async findByKey(key: string) {
        return await FeatureModel.findOne({ key });
    }

    async findById(id: string) {
        return await FeatureModel.findById(id);
    }

    async findAll() {
        return await FeatureModel.find({ isActive: true });
    }

    async updateFeature(id: string, data: Partial<IFeature>) {
        return await FeatureModel.findByIdAndUpdate(
            id,
            data,
            { new: true }
        );
    }

    async deactivateFeature(id: string) {
        return await FeatureModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }
    
    async activateFeature(id: string) {
        return await FeatureModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }

}