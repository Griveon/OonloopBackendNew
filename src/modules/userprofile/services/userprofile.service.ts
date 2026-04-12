import { UserProfileRepository } from "../repositories/userprofile.repository.js";
import type { IUserProfile } from "../interfaces/userprofile.interface.js";

export class UserProfileService {
    private repo: UserProfileRepository;

    constructor() {
        this.repo = new UserProfileRepository();
    }

    async create(userId: any) {
        const existing = await this.repo.findByUserId(userId);

        if (existing) {
            throw new Error("Profile already exists");
        }

        return await this.repo.create({ user: userId });
    }

    async getProfile(userId: string) {
        const profile = await this.repo.findByUserId(userId);
        if (!profile) throw new Error("Profile not found");
        return profile;
    }

    async update(userId: string, data: Partial<IUserProfile>) {
        const profile = await this.repo.update(userId, data);
        if (!profile) throw new Error("Profile not found");
        return profile;
    }

    async addAddress(userId: string, address: any) {
        return await this.repo.addAddress(userId, address);
    }
    async updateAddress(userId: string, addressId: string, data: any) {
        const profile = await this.repo.updateAddress(userId, addressId, data);

        if (!profile) throw new Error("Address not found");

        return profile;
    }
    async deleteAddress(userId: string, addressId: string) {
        return await this.repo.deleteAddress(userId, addressId);
    }

    async setDefaultAddress(userId: string, addressId: string) {
        return await this.repo.setDefaultAddress(userId, addressId);
    }
}