import type { IFeature } from "../interfaces/feature.interface.js";
import { FeatureRepository } from "../repository/feature.repository.js";
import { generateFeatureKey } from "../utils/generatefeaturekey.util.js";

export class FeatureService {
    private featureRepository: FeatureRepository;

    constructor() {
        this.featureRepository = new FeatureRepository();
    }

    async createFeature(data: IFeature) {

        const key = generateFeatureKey(data.name);

        const existingFeature = await this.featureRepository.findByKey(key);
        if (existingFeature) {
            throw new Error(`Feature with key "${key}" already exists`);
        }

        const feature = await this.featureRepository.createFeature({
            ...data,
            key,
        });

        return feature;
    }

    async getAllFeatures() {
        return await this.featureRepository.findAll();
    }

    async getFeatureById(featureId: string) {
        const feature = await this.featureRepository.findById(featureId);
        if (!feature) {
            throw new Error("Feature not found");
        }
        return feature;
    }

    async updateFeature(featureId: string, data: Partial<IFeature>) {
        const feature = await this.featureRepository.findById(featureId);
        if (!feature) {
            throw new Error("Feature not found");
        }

        if (data.name) {
            data.key = generateFeatureKey(data.name);

            const existingFeature = await this.featureRepository.findByKey(data.key);
            if (existingFeature && existingFeature._id.toString() !== featureId) {
                throw new Error(`Feature with key "${data.key}" already exists`);
            }
        }

        const updatedFeature = await this.featureRepository.updateFeature(featureId, data);
        return updatedFeature;
    }

    async deactivateFeature(featureId: string) {
        const feature = await this.featureRepository.findById(featureId);
        if (!feature) {
            throw new Error("Feature not found");
        }
        return await this.featureRepository.deactivateFeature(featureId);
    }

    async activateFeature(featureId: string) {
        const feature = await this.featureRepository.findById(featureId);
        if (!feature) {
            throw new Error("Feature not found");
        }

        return await this.featureRepository.activateFeature(featureId);
    }
}