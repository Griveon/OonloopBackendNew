import { GSTRuleModel } from "../../gstrule/models/gstrule.model.js";
import { PlatformCommissionModel } from "../../platformcommisison/models/platformcommission.model.js";
import { ProductModel } from "../../product/models/product.model.js";

export class OrderSummuryRepository {

    async getProductsByIds(ids: string[]) {
        return ProductModel.find({ _id: { $in: ids } });
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