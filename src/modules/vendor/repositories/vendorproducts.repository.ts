import mongoose from "mongoose";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";
import { ProductModel } from "../../product/models/product.model.js";

export class VendorProductsRepository {
    async findVendorWithProducts(
        vendorId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
        category?: string,
        minPrice?: number,
        maxPrice?: number,
        inStock?: boolean
    ) {
        const skip = (page - 1) * limit;

        const vendor = await VendorProfileModel.findOne({
            user: new mongoose.Types.ObjectId(vendorId),
        }).populate("user", "name email mobile");

        if (!vendor) {
            throw new Error("Vendor not found");
        }

        const productFilter: any = {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            isActive: true,
        };

        if (search) {
            productFilter.name = { $regex: search, $options: "i" };
        }

        if (category) {
            productFilter.category = new mongoose.Types.ObjectId(category);
        }

        if (minPrice || maxPrice) {
            productFilter.mrp = {};
            if (minPrice) productFilter.mrp.$gte = minPrice;
            if (maxPrice) productFilter.mrp.$lte = maxPrice;
        }

        if (inStock) {
            productFilter.stock = { $gt: 0 };
        }

        const [products, total] = await Promise.all([
            ProductModel.find(productFilter)
                .populate("category", "name")
                .populate("productCategory", "name")
                .populate("unit", "name")
                .populate("attributes.brand", "name")
                .skip(skip)
                .limit(limit)
                .lean(),

            ProductModel.countDocuments(productFilter),
        ]);

        const categoriesMap = new Map();

        products.forEach((product: any) => {
            if (product.category) {
                categoriesMap.set(product.category._id.toString(), product.category);
            }
        });

        const categories = Array.from(categoriesMap.values());

        return {
            vendor,
            categories,
            products,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
}