import { GSTRuleModel } from "../../gstrule/models/gstrule.model.js";
import { PlatformCommissionModel } from "../../platformcommisison/models/platformcommission.model.js";
import { ProductModel } from "../../product/models/product.model.js";
import { VendorCouponModel } from "../../vendorcoupon/models/vendorcoupon.model.js";

export class OrderSummuryRepository {

    async getProductsByIds(ids: string[]) {
        return ProductModel.find({ _id: { $in: ids } });
    }

    // Active coupon must belong to the given vendor (a code is unique per vendor).
    // This is what enforces "a coupon only applies to its own seller's products".
    async getActiveCoupon(couponCode: string, vendorId: any) {
        return VendorCouponModel.findOne({
            couponCode: couponCode.toUpperCase().trim(),
            vendorId,
            isActive: true,
        });
    }

    async getActivePlatformFee() {
        return await PlatformCommissionModel.find().sort({ createdAt: -1 });
    }

    async getGstRulesByHsnCodes(hsnCodes: string[]) {
        return GSTRuleModel.find({
            hsnCode: { $in: hsnCodes },
            isActive: true
        });
    }
}