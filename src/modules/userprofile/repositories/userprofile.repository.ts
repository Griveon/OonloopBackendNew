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

        const isFirstAddress = profile.addresses.length === 0;

        const newAddress = {
            ...address,
            isDefault: isFirstAddress ? true : !!address.isDefault,
        };

        if (newAddress.isDefault) {
            profile.addresses.forEach((addr: any) => {
                addr.isDefault = false;
            });
        }

        profile.addresses.push(newAddress);

        await profile.save();

        return profile;
    }

    async updateAddress(userId: string, addressId: string, address: any) {
        const profile: any = await UserProfileModel.findOne({ user: userId });

        if (!profile) {
            throw new Error("User profile not found");
        }

        const existingAddress = profile.addresses.id(addressId);

        if (!existingAddress) {
            throw new Error("Address not found");
        }

        if (address.isDefault === true) {
            profile.addresses.forEach((addr: any) => {
                addr.isDefault = false;
            });
        }

        existingAddress.set({
            label: address.label ?? existingAddress.label,
            fullName: address.fullName ?? existingAddress.fullName,
            mobileNumber: address.mobileNumber ?? existingAddress.mobileNumber,
            addressLine1: address.addressLine1 ?? existingAddress.addressLine1,
            addressLine2: address.addressLine2 ?? existingAddress.addressLine2,
            landmark: address.landmark ?? existingAddress.landmark,
            city: address.city ?? existingAddress.city,
            state: address.state ?? existingAddress.state,
            country: address.country ?? existingAddress.country,
            postalCode: address.postalCode ?? existingAddress.postalCode,
            location: address.location ?? existingAddress.location,
            isDefault: address.isDefault ?? existingAddress.isDefault,
        });

        const defaultCount = profile.addresses.filter((addr: any) => addr.isDefault).length;

        if (defaultCount === 0 && profile.addresses.length > 0) {
            profile.addresses[0].isDefault = true;
        }

        await profile.save();

        return profile;
    }

    async deleteAddress(userId: string, addressId: string) {
        return await UserProfileModel.findOneAndUpdate(
            { user: userId },
            { $pull: { addresses: { _id: addressId } } },
            { new: true }
        );
    }

    async setDefaultAddress(userId: string, addressId: string) {
        const profile: any = await UserProfileModel.findOne({ user: userId });

        if (!profile) {
            throw new Error("User profile not found");
        }

        const addressExists = profile.addresses.some(
            (addr: any) => addr._id.toString() === addressId
        );

        if (!addressExists) {
            throw new Error("Address not found");
        }

        profile.addresses.forEach((addr: any) => {
            addr.isDefault = addr._id.toString() === addressId;
        });

        await profile.save();

        return profile;
    }
}