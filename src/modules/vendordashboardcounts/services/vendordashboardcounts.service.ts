import { VendorDashboardCountsRepository } from "../repositories/vendordashboardcounts.repository.js";

export class VendorDashboardCountsService {
    private repo: VendorDashboardCountsRepository;

    constructor() {
        this.repo = new VendorDashboardCountsRepository();
    }

    async getCounts(userId: string) {
        const [
            productCount,
            brandCount,
            couponCount,
            // orderStats
        ] = await Promise.all([
            this.repo.getProductCount(userId),
            this.repo.getBrandCount(userId),
            this.repo.getCouponCount(userId),
            // this.repo.getOrderStats(userId),
        ]);

        return {
            products: productCount,
            brands: brandCount,
            coupons: couponCount,
            // orders: orderStats,
        };
    }
}