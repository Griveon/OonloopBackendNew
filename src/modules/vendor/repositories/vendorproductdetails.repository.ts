import mongoose from "mongoose";
import { ProductModel } from "../../product/models/product.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";

export class VendorProductDetailsRepository {
    async findVendorProductDetails(vendorId: string, productId: string) {
        const vendor = await VendorProfileModel.findOne({
            user: new mongoose.Types.ObjectId(vendorId),
        }).populate("user", "name email mobile");

        if (!vendor) {
            throw new Error("Vendor not found");
        }

        const product = await ProductModel.findOne({
            _id: new mongoose.Types.ObjectId(productId),
            vendorId: new mongoose.Types.ObjectId(vendorId),
            isActive: true,
        })
            .populate("productCategory", "name")
            .populate("category", "name")
            .populate("unit", "name")
            .populate("attributes.brand", "name")
            .populate("ribbon", "name")
            .populate("gst.gstRuleId", "name gstPercent")
            .lean();

        if (!product) {
            throw new Error("Product not found");
        }

        // Related products
        const relatedProducts = await ProductModel.find({
            vendorId: new mongoose.Types.ObjectId(vendorId),
            category: product.category?._id,
            _id: { $ne: product._id },
            isActive: true,
        })
            .limit(10)
            .select("name images mrp stock")
            .lean();

        return {
            vendor,
            product,
            relatedProducts,
        };
    }
}