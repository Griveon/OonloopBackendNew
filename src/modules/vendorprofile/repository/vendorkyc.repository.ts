import { VendorProfileModel } from "../models/vendorprofile.model.js";

export class VendorKycRepository {

    async findByVendorId(vendorId: string) {
        const vendor = await VendorProfileModel.findById(vendorId);

        if (!vendor) throw new Error("Vendor not found");

        return vendor;
    }

    async findByUserId(userId: string) {
        const vendor = await VendorProfileModel.findOne(
            { user: userId },
            "kycDocuments isKycSubmitted isKycApproved"
        );

        if (!vendor) throw new Error("Vendor not found");

        return vendor;
    }

    async updateKycDocuments(vendorId: string, docs: any) {
        const updateQuery: any = {};

        for (const key in docs) {
            updateQuery[`kycDocuments.${key}`] = docs[key];
        }

        updateQuery["isKycSubmitted"] = true;

        return await VendorProfileModel.findByIdAndUpdate(
            vendorId,
            { $set: updateQuery },
            { new: true }
        );
    }

    async removeDocument(userId: string, docKey: string) {
        const vendor: any = await VendorProfileModel.findOne({ user: userId });

        if (!vendor) throw new Error("Vendor not found");

        if (!vendor.kycDocuments?.[docKey]) {
            throw new Error("Document not found");
        }

        vendor.kycDocuments[docKey] = undefined;

        await vendor.save();

        return docKey;
    }
}