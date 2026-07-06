import { VendorProfileModel } from "../models/vendorprofile.model.js";

export class VendorKycRepository {
    async findByUserId(userId: string) {
        const vendor = await VendorProfileModel.findOne({ user: userId });

        if (!vendor) {
            throw new Error("Vendor profile not found");
        }

        return vendor;
    }

    async findFullKycByUserId(userId: string) {
        const vendor = await VendorProfileModel.findOne({ user: userId }).select(
            "user kycDocuments isKycSubmitted isKycApproved isVerified profileStatus"
        );

        if (!vendor) {
            throw new Error("Vendor profile not found");
        }

        return vendor;
    }

    async findKycStatusByUserId(userId: string) {
        const vendor = await VendorProfileModel.findOne({ user: userId }).select(
            "kycDocuments isKycSubmitted isKycApproved isVerified profileStatus"
        );

        if (!vendor) {
            throw new Error("Vendor profile not found");
        }

        return vendor;
    }

    async updateKycDocuments(vendorId: string, docs: Record<string, any>) {
        const setPayload: Record<string, any> = {};

        for (const key of Object.keys(docs)) {
            setPayload[`kycDocuments.${key}`] = docs[key];
        }

        setPayload.isKycSubmitted = true;
        setPayload.isKycApproved = false;

        /**
         * Keep vendor pending after new upload.
         * If previously rejected, this moves it back to pending for re-review.
         */
        setPayload.profileStatus = "pending";
        setPayload.isVerified = false;

        const vendor = await VendorProfileModel.findByIdAndUpdate(
            vendorId,
            {
                $set: setPayload,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!vendor) {
            throw new Error("Vendor profile not found");
        }

        return vendor;
    }

    async removeDocument(userId: string, docKey: string) {
        const vendor = await VendorProfileModel.findOneAndUpdate(
            { user: userId },
            {
                $unset: {
                    [`kycDocuments.${docKey}`]: "",
                },
                $set: {
                    isKycSubmitted: false,
                    isKycApproved: false,
                    isVerified: false,
                    profileStatus: "pending",
                },
            },
            {
                new: true,
            }
        );

        if (!vendor) {
            throw new Error("Vendor profile not found");
        }

        return vendor;
    }
}