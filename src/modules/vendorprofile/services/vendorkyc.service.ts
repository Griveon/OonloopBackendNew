import { VendorKycRepository } from "../repository/vendorkyc.repository.js";

export class VendorKycService {
    private repo: VendorKycRepository;

    constructor() {
        this.repo = new VendorKycRepository();
    }

    async upload(vendorId: string, docs: any) {
        return await this.repo.updateKycDocuments(vendorId, docs);
    }

    async getKycDocuments(userId: string) {
        const vendor = await this.repo.findByUserId(userId);

        return {
            kycDocuments: vendor.kycDocuments || {},
            isKycSubmitted: vendor.isKycSubmitted || false,
            isKycApproved: vendor.isKycApproved || false,
        };
    }

    async deleteKycDocument(userId: string, docKey: string) {
        return await this.repo.removeDocument(userId, docKey);
    }
}