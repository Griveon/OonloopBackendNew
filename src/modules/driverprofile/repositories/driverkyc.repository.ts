import { DriverProfileModel } from "../models/driverprofile.model.js";

export class DriverKycRepository {
    async findByDriverId(driverId: string) {
        const driver = await DriverProfileModel.findById(driverId);

        if (!driver) {
            throw new Error("Driver profile not found");
        }

        return driver;
    }

    async findByUserId(userId: string) {
        const driver = await DriverProfileModel.findOne(
            { user: userId },
            "kycDocuments isKycSubmitted isKycApproved profileStatus isVerified"
        );

        if (!driver) {
            throw new Error("Driver profile not found");
        }

        return driver;
    }

    async findFullKycByUserId(userId: string) {
        const driver = await DriverProfileModel.findOne(
            { user: userId },
            "user kycDocuments isKycSubmitted isKycApproved profileStatus isVerified createdAt updatedAt"
        );

        if (!driver) {
            throw new Error("Driver profile not found");
        }

        return driver;
    }

    async updateKycDocuments(driverId: string, docs: Record<string, any>) {
        const updateQuery: any = {};

        for (const key in docs) {
            updateQuery[`kycDocuments.${key}`] = docs[key];
        }

        updateQuery["isKycSubmitted"] = true;
        updateQuery["isKycApproved"] = false;
        updateQuery["profileStatus"] = "pending";
        updateQuery["isVerified"] = false;

        return await DriverProfileModel.findByIdAndUpdate(
            driverId,
            { $set: updateQuery },
            { new: true }
        );
    }

    async removeDocument(userId: string, docKey: string) {
        const driver: any = await DriverProfileModel.findOne({ user: userId });

        if (!driver) {
            throw new Error("Driver profile not found");
        }

        const allowedDocKeys = [
            "aadhaarCard",
            "panCard",
            "drivingLicense",
            "rcBook",
            "insurance",
            "vehiclePermit",
            "pollutionCertificate",
            "profilePhoto",
        ];

        if (!allowedDocKeys.includes(docKey)) {
            throw new Error("Invalid document key");
        }

        if (!driver.kycDocuments?.[docKey]) {
            throw new Error("Document not found");
        }

        driver.kycDocuments[docKey] = undefined;

        await driver.save();

        return docKey;
    }

    async findKycStatusByUserId(userId: string) {
        const driver = await DriverProfileModel.findOne(
            { user: userId },
            "kycDocuments isKycSubmitted isKycApproved profileStatus isVerified"
        );

        if (!driver) {
            throw new Error("Driver profile not found");
        }

        return driver;
    }
}