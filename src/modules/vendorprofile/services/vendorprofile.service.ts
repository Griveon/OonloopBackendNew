import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { IVendorDocument } from "../interfaces/vendorprofile.interface.js";
import { VendorProfileRepository } from "../repository/vendorprofile.repository.js";
import { UserRepository } from "../../user/repositories/user.repository.js";

export class VendorProfileService {
    private vendorRepo: VendorProfileRepository;
    private userRepository: UserRepository;

    constructor() {
        this.vendorRepo = new VendorProfileRepository();
        this.userRepository = new UserRepository();
    }

    async createVendor(data: Partial<IVendorDocument>) {

        if (!data.user) throw new Error("User ID is required");

        const existingVendor = await this.vendorRepo.findOne({ user: data.user });
        if (existingVendor) throw new Error("Vendor profile for this user already exists");

        if (data.gstNumber) {
            const gstExists = await this.vendorRepo.findOne({ gstNumber: data.gstNumber });
            if (gstExists) throw new Error("GST number already exists");
        }
        if (data.panNumber) {
            const panExists = await this.vendorRepo.findOne({ panNumber: data.panNumber });
            if (panExists) throw new Error("PAN number already exists");
        }

        return await this.vendorRepo.create(data);
    }

    async getVendorById(id: string) {
        console.log(id);

        const vendor = await this.vendorRepo.findById(id);
        const user = await this.userRepository.findById(id);

        if (!vendor) throw new Error("Vendor not found");
        if (!user) throw new Error("User not found");

        return {
            vendor,
            user,
        };
    }

    async getAllVendors(options: { page?: number; limit?: number; search?: string }) {
        const { page = 1, limit = 10, search = "" } = options;
        return await this.vendorRepo.findAll(page, limit, search);
    }

    async updateVendor(id: string, data: Partial<IVendorDocument>) {
        const vendor = await this.vendorRepo.findById(id);
        if (!vendor) throw new Error("Vendor not found");
        return await this.vendorRepo.update(id, data);
    }

    async deleteVendor(id: string) {
        const vendor = await this.vendorRepo.findById(id);
        if (!vendor) throw new Error("Vendor not found");
        return await this.vendorRepo.delete(id);
    }

    async submitKyc(id: string, data: Partial<IVendorDocument>) {
        const vendor = await this.vendorRepo.findById(id);
        if (!vendor) throw new Error("Vendor not found");
        return await this.vendorRepo.updateKyc(id, { ...data, isKycSubmitted: true });
    }

    async approveKyc(id: string) {
        const vendor = await this.vendorRepo.findById(id);
        if (!vendor) throw new Error("Vendor not found");
        return await this.vendorRepo.update(id, { isKycApproved: true, profileStatus: "approved" });
    }

    async rejectKyc(id: string) {
        const vendor = await this.vendorRepo.findById(id);
        if (!vendor) throw new Error("Vendor not found");
        return await this.vendorRepo.update(id, { isKycApproved: false, profileStatus: "rejected" });
    }

    async isProfileCompleted(userId: string) {
        const vendor = await this.vendorRepo.findByUserId(userId);

        if (!vendor) {
            return { completed: false, message: "Vendor profile not found" };
        }

        return { completed: true, message: "Vendor profile exists" };
    }


}