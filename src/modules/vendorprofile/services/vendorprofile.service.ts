import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { IVendorDocument } from "../interfaces/vendorprofile.interface.js";
import { VendorProfileRepository } from "../repository/vendorprofile.repository.js";
import { UserRepository } from "../../user/repositories/user.repository.js";
import { uploadVendorProfileImageToR2 } from "../utils/uploadVendorProfileImageToR2.js";
import { deleteVendorAssetFromR2, uploadVendorStoreImageToR2 } from "../utils/uploadVendorStoreImageToR2.js";

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

    async isKYCCompletedByUser(userId: string) {
        const vendor = await this.vendorRepo.findByUserId(userId);

        if (!vendor) {
            return { completed: false, message: "Vendor profile not found" };
        }

        return { completed: true, message: "Vendor profile exists" };
    }

    async getKYCStatusByUser(userId: string) {
        const vendor = await this.vendorRepo.findKYCStatusByUserId(userId);

        if (!vendor) {
            return {
                isKycSubmitted: false,
                isKycApproved: false,
                profileStatus: "not_created",
                message: "Vendor profile not found",
            };
        }

        return {
            isKycSubmitted: vendor.isKycSubmitted,
            isKycApproved: vendor.isKycApproved,
            profileStatus: vendor.profileStatus,
            message: "KYC status fetched successfully",
        };
    }

    async updateHolidayStatus(
        userId: string,
        isOnHoliday: boolean,
        holidayMessage?: string
    ) {
        const vendor = await this.vendorRepo.findByUserId(userId);

        if (!vendor) {
            throw new Error("Vendor not found");
        }

        return await this.vendorRepo.updateHolidayStatus(
            userId,
            isOnHoliday,
            holidayMessage
        );
    }

    async updateProfileImage(userId: string, file: Express.Multer.File) {
        console.log("USER COMES", userId, file)
        const image = await uploadVendorProfileImageToR2(file, userId);

        return await this.vendorRepo.updateStoreLogo(userId, image);
    }


    async uploadStoreImages(
        userId: string,
        files: Express.Multer.File[]
    ) {
        const vendor = await this.vendorRepo.getVendorByUserId(userId);

        if (!vendor) {
            throw new Error("Vendor not found");
        }

        const existingImages = vendor.storeImages ?? [];

        const uploadedImages = [];

        for (let i = 0; i < files.length; i++) {
            const url = await uploadVendorStoreImageToR2(
                files[i]!,
                userId
            );

            uploadedImages.push({
                url,
                name: files[i]!.originalname,
                alt: "",
                isPrimary: existingImages.length === 0 && i === 0,
                position: existingImages.length + i,
            });
        }

        return await this.vendorRepo.addStoreImages(
            userId,
            uploadedImages
        );
    }

    async updateStoreImages(
        userId: string,
        images: any[]
    ) {
        const vendor = await this.vendorRepo.getVendorByUserId(userId);

        if (!vendor) {
            throw new Error("Vendor not found");
        }

        return await this.vendorRepo.updateStoreImages(
            userId,
            images
        );
    }

    async removeStoreImage(
        userId: string,
        imageId: any
    ) {
        const vendor = await this.vendorRepo.getVendorByUserId(userId);

        if (!vendor) {
            throw new Error("Vendor not found");
        }

        const images = vendor.storeImages ?? [];

        const image = images.find(
            (img: any) => img.url?.toString() === imageId
        );

        if (!image) {
            throw new Error("Image not found");
        }

        await deleteVendorAssetFromR2(image.url);

        vendor.storeImages = images.filter(
            (img: any) => img.url?.toString() !== imageId
        );

        return await vendor.save();
    }

    async getStoreImages(userId: string) {
        return await this.vendorRepo.getStoreImages(userId);
    }
}