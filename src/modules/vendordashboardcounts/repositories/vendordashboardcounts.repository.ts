import { ProductModel } from "../../product/models/product.model.js";
import { BrandModel } from "../../brand/models/brand.model.js";
import { VendorCouponModel } from "../../vendorcoupon/models/vendorcoupon.model.js";

export class VendorDashboardCountsRepository {

    async getProductCount(userId: string) {
        return await ProductModel.countDocuments({
            vendorId: userId,
            isActive: true,
        });
    }

    async getBrandCount(userId: string) {
        return await BrandModel.countDocuments({
            vendorId: userId,
            isActive: true,
        });
    }

    async getCouponCount(userId: string) {
        return await VendorCouponModel.countDocuments({
            vendorId: userId,
        });
    }

    // async getOrderStats(userId: string) {
    //     const statuses = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

    //     const counts = await Promise.all(
    //         statuses.map((status) =>
    //             OrderModel.countDocuments({
    //                 vendorId: userId,
    //                 status,
    //             })
    //         )
    //     );

    //     return {
    //         placed: counts[0],
    //         confirmed: counts[1],
    //         shipped: counts[2],
    //         delivered: counts[3],
    //         cancelled: counts[4],
    //         total: counts.reduce((a, b) => a + b, 0),
    //     };
    // }
}