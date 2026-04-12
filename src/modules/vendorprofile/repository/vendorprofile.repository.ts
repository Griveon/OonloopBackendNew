import type { IVendorDocument } from "../interfaces/vendorprofile.interface.js";
import { VendorProfileModel } from "../models/vendorprofile.model.js";

export class VendorProfileRepository {

    async create(data: Partial<IVendorDocument>) {
        return await VendorProfileModel.create(data);
    }

    async findOne(filter: any) {
        return await VendorProfileModel.findOne(filter);
    }

    async findById(id: string) {
        return await VendorProfileModel.findOne({ user: id });
    }

    async findByUserId(userId: string) {
        return await VendorProfileModel.findOne({ user: userId });
    }

    async findKYCStatusByUserId(userId: string) {
        return await VendorProfileModel.findOne(
            { user: userId },
            { isKycSubmitted: 1, isKycApproved: 1, profileStatus: 1 }
        );
    }

    async findByEmail(email: string) {
        return await VendorProfileModel.findOne({ email });
    }

    async update(id: string, data: Partial<IVendorDocument>) {
        const updateQuery: any = {};

        const flatten = (obj: any, parent = "") => {
            for (const key in obj) {
                const value = obj[key];
                const newKey = parent ? `${parent}.${key}` : key;

                if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                ) {
                    flatten(value, newKey);
                } else {
                    updateQuery[newKey] = value;
                }
            }
        };

        flatten(data);

        return await VendorProfileModel.findOneAndUpdate(
            { user: id },
            { $set: updateQuery },
            { new: true }
        );
    }

    async delete(id: string) {
        return await VendorProfileModel.findByIdAndDelete(id);
    }

    async findAll(page = 1, limit = 10, search = "") {
        const filter: any = {};
        if (search) {
            filter.$or = [
                { storeName: { $regex: search, $options: "i" } },
                { storeSlug: { $regex: search, $options: "i" } },
                { gstNumber: { $regex: search, $options: "i" } },
                { panNumber: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const [vendors, total] = await Promise.all([
            VendorProfileModel.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            VendorProfileModel.countDocuments(filter),
        ]);

        return { vendors, total };
    }

    async updateKyc(id: string, data: Partial<IVendorDocument>) {
        return await VendorProfileModel.findByIdAndUpdate(id, data, { new: true });
    }

    async updateLastLogin(id: string) {
        return await VendorProfileModel.findByIdAndUpdate(id, { lastLogin: new Date() }, { new: true });
    }
}