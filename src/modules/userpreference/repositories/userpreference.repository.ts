import { UserPreferenceModel } from "../models/userpreference.model.js";

export class UserPreferenceRepository {

    async getByUser(userId: string) {
        return await UserPreferenceModel.findOne({ user: userId });
    }

    async create(userId: string) {
        return await UserPreferenceModel.create({
            user: userId,
            values: {},
        });
    }

    async setValue(userId: string, key: string, value: any) {
        return await UserPreferenceModel.findOneAndUpdate(
            { user: userId },
            {
                $set: {
                    [`values.${key}`]: value,
                },
            },
            { new: true, upsert: true }
        );
    }

    async setMultiple(userId: string, values: Record<string, any>) {
        const update: any = {};

        Object.keys(values).forEach((key) => {
            update[`values.${key}`] = values[key];
        });

        return await UserPreferenceModel.findOneAndUpdate(
            { user: userId },
            { $set: update },
            { new: true, upsert: true }
        );
    }

    async reset(userId: string) {
        return await UserPreferenceModel.findOneAndUpdate(
            { user: userId },
            { values: {} },
            { new: true }
        );
    }
}