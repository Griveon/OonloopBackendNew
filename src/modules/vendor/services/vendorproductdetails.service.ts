import { VendorProductDetailsRepository } from "../repositories/vendorproductdetails.repository.js";

export class VendorProductDetailsService {
    private repo: VendorProductDetailsRepository;

    constructor() {
        this.repo = new VendorProductDetailsRepository();
    }

    async getVendorProductDetails(vendorId: any, productId: any) {
        return await this.repo.findVendorProductDetails(vendorId, productId);
    }
}