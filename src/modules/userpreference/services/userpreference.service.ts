import mongoose from "mongoose";
import { UserPreferenceRepository } from "../repositories/userpreference.repository.js";
import { UserModel } from "../../user/models/user.model.js";
import { USER_PREFERENCES } from "../constants/userpreference.constants.js";

export class UserPreferenceService {
    private repo: UserPreferenceRepository;

    constructor() {
        this.repo = new UserPreferenceRepository();
    }

    // 👤 Validate user ID format
    private validateUser(userId: string) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID");
        }
    }

    // 👤 Ensure user exists
    private async ensureUserExists(userId: string) {
        this.validateUser(userId);

        const user = await UserModel.findById(userId);
        if (!user) throw new Error("User not found");
    }

    // 📌 Get preferences
    async getPreferences(userId: string) {
        await this.ensureUserExists(userId);

        let prefs = await this.repo.getByUser(userId);

        if (!prefs) {
            prefs = await this.repo.create(userId);
        }

        return prefs;
    }

    // 🔍 Get preference definition
    private getPreferenceDefinition(key: string) {
        const pref = Object.values(USER_PREFERENCES).find(
            (p) => p.key === key
        );

        if (!pref) {
            throw new Error(`Invalid preference key: ${key}`);
        }

        return pref;
    }

    private async validateObjectIdWithRef(pref: any, value: any) {
        if (value !== null && !mongoose.Types.ObjectId.isValid(value)) {
            throw new Error(`${pref.key} must be a valid ObjectId or null`);
        }

        if (!value) return;

        if (pref.ref) {
            const Model = mongoose.model(pref.ref);

            const exists = await Model.findById(value);

            if (!exists) {
                throw new Error(
                    `${pref.key} references invalid ${pref.ref} ID`
                );
            }
        }
    }

    // 🔐 FULL VALIDATION ENGINE
    private async validatePreferenceValue(key: string, value: any) {
        const pref: any = this.getPreferenceDefinition(key);

        switch (pref.type) {
            case "string":
                if (typeof value !== "string") {
                    throw new Error(`${key} must be a string`);
                }

                if (pref.allowed && !pref.allowed.includes(value)) {
                    throw new Error(`${key} has invalid value`);
                }
                break;

            case "boolean":
                if (typeof value !== "boolean") {
                    throw new Error(`${key} must be a boolean`);
                }
                break;

            case "objectId":
                await this.validateObjectIdWithRef(pref, value);
                break;

            default:
                throw new Error(`Unsupported type for ${key}`);
        }
    }

    // ✏️ Set single preference
    async setPreference(userId: string, key: string, value: any) {
        await this.ensureUserExists(userId);

        await this.validatePreferenceValue(key, value);

        return await this.repo.setValue(userId, key, value);
    }

    // ✏️ Set multiple preferences
    async setPreferences(userId: string, values: Record<string, any>) {
        await this.ensureUserExists(userId);

        for (const key of Object.keys(values)) {
            await this.validatePreferenceValue(key, values[key]);
        }

        return await this.repo.setMultiple(userId, values);
    }

    // 🔄 Reset preferences
    async resetPreferences(userId: string) {
        await this.ensureUserExists(userId);

        return await this.repo.reset(userId);
    }
}