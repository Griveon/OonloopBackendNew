import { UserProfileModel } from "../models/userprofile.model.js";
import type { IUserProfile } from "../interfaces/userprofile.interface.js";

export class UserProfileRepository {

    async create(data: IUserProfile) {
        return await UserProfileModel.create(data);
    }

    async findByUserId(userId: string) {
        return await UserProfileModel.findOne({ user: userId })
            .populate("user");
    }

    async update(userId: string, data: Partial<IUserProfile>) {
        return await UserProfileModel.findOneAndUpdate(
            { user: userId },
            data,
            { new: true }
        );
    }

    async addAddress(userId: string, address: any) {
        // 1. Ensure profile exists (create if missing)
        let profile: any = await UserProfileModel.findOne({ user: userId });

        if (!profile) {
            profile = await UserProfileModel.create({
                user: userId,
                addresses: [],
                preferences: {
                    language: "en",
                    notificationsEnabled: true,
                },
            });
        }

        profile.addresses.push(address);

        await profile.save();

        return profile;
    }

    async updateAddress(userId: string, addressId: string, data: any) {
        return await UserProfileModel.findOneAndUpdate(
            {
                user: userId,
                "addresses._id": addressId
            },
            {
                $set: {
                    "addresses.$": {
                        ...data,
                        _id: addressId
                    }
                }
            },
            { new: true }
        );
    }

    async deleteAddress(userId: string, addressId: string) {
        return await UserProfileModel.findOneAndUpdate(
            { user: userId },
            { $pull: { addresses: { _id: addressId } } },
            { new: true }
        );
    }

    async setDefaultAddress(userId: string, addressId: string) {
        // Step 1: Reset all to false
        await UserProfileModel.updateOne(
            { user: userId },
            { $set: { "addresses.$[].isDefault": false } }
        );

        const updated = await UserProfileModel.findOneAndUpdate(
            {
                user: userId,
                "addresses._id": addressId
            },
            {
                $set: {
                    "addresses.$.isDefault": true
                }
            },
            { new: true }
        );

        if (!updated) throw new Error("Address not found");

        return updated;
    }
}