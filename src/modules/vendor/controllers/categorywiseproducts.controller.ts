import type { Request, Response } from "express";
import mongoose from "mongoose";
import { CategoryProductsService } from "../services/categorywiseproducts.service.js";
import { VendorCategoryModel } from "../../vendorcategory/models/vendorcategory.model.js";

export class CategoryProductsController {
    private service: CategoryProductsService;

    constructor() {
        this.service = new CategoryProductsService();
    }

    getSubCategories = async (req: Request, res: Response) => {
        try {
            const { categoryId = "all" } = req.query;
            let resolvedCategoryId = String(categoryId);
            if (
                resolvedCategoryId === "restaurant" ||
                resolvedCategoryId === "restaurants"
            ) {
                const restCat = await VendorCategoryModel.findOne({
                    name: { $regex: /restaurant/i },
                    isActive: true,
                }).select("_id").lean();

                if (restCat) {
                    resolvedCategoryId = restCat._id.toString();
                }
            }

            if (
                resolvedCategoryId &&
                resolvedCategoryId !== "all" &&
                !mongoose.Types.ObjectId.isValid(resolvedCategoryId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid categoryId",
                });
            }

            const data = await this.service.getSubCategories(resolvedCategoryId);

            return res.status(200).json({
                success: true,
                message: "Sub categories fetched successfully",
                data,
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error?.message || "Failed to fetch sub categories",
            });
        }
    };

    getCategoryProducts = async (req: Request, res: Response) => {
        try {
            const {
                categoryId = "all",
                latitude,
                longitude,
                maxDistance = 10000,
                page = 1,
                limit = 10,
                search = "",
                vendorId,

                // New L2 filters from frontend
                l2CategoryId,
                l2CategoryName,
            } = req.query;

            // Existing support
            const productCategoryId =
                req.query.productCategoryId ||
                req.query.subcategoryId ||
                "all";

            if (!latitude || !longitude) {
                return res.status(400).json({
                    success: false,
                    message: "Latitude and longitude are required",
                });
            }

            if (
                categoryId &&
                categoryId !== "all" &&
                !mongoose.Types.ObjectId.isValid(String(categoryId))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid categoryId",
                });
            }

            if (
                productCategoryId &&
                productCategoryId !== "all" &&
                !mongoose.Types.ObjectId.isValid(String(productCategoryId))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid productCategoryId",
                });
            }

            if (
                l2CategoryId &&
                String(l2CategoryId) !== "all" &&
                !mongoose.Types.ObjectId.isValid(String(l2CategoryId))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid l2CategoryId",
                });
            }

            if (
                vendorId &&
                !mongoose.Types.ObjectId.isValid(String(vendorId))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid vendorId",
                });
            }

            const data = await this.service.getCategoryProducts(
                String(categoryId),
                String(productCategoryId),
                Number(latitude),
                Number(longitude),
                Number(maxDistance),
                Number(page),
                Number(limit),
                String(search),
                vendorId ? String(vendorId) : undefined,
                l2CategoryId ? String(l2CategoryId) : undefined,
                l2CategoryName ? String(l2CategoryName) : undefined
            );

            return res.status(200).json({
                success: true,
                message: "Category products fetched successfully",
                data,
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error?.message || "Failed to fetch category products",
            });
        }
    };

    getRestaurants = async (req: Request, res: Response) => {
        try {
            const {
                categoryId,
                latitude,
                longitude,
                maxDistance = 10000,
                page = 1,
                limit = 12,
                search = "",
                category,
                l2CategoryName,
                l2CategoryId,
                productCategoryId,
            } = req.query;

            if (!latitude || !longitude) {
                return res.status(400).json({
                    success: false,
                    message: "Latitude and longitude are required",
                });
            }

            const effectiveCategory =
                categoryId ||
                category ||
                l2CategoryName ||
                l2CategoryId ||
                productCategoryId;

            const categoryFilter =
                effectiveCategory && String(effectiveCategory) !== "all"
                    ? String(effectiveCategory)
                    : undefined;

            const result = await this.service.getRestaurants(
                categoryFilter,
                Number(latitude),
                Number(longitude),
                Number(maxDistance),
                String(search),
                Number(page),
                Number(limit)
            );

            const restaurantsList = Array.isArray(result)
                ? result
                : (result?.restaurants || []);
            const allCategories = result?.categories || [];
            const categoryList = result?.categoryList || [];
            const meta = {
                page: result?.page || Number(page) || 1,
                limit: result?.limit || Number(limit) || 12,
                total: result?.total ?? restaurantsList.length,
                totalPages: result?.totalPages ?? (restaurantsList.length > 0 ? 1 : 0),
            };

            return res.status(200).json({
                success: true,
                message: "Restaurants fetched successfully",
                data: restaurantsList,
                categories: allCategories,
                categoryList,
                meta,
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error?.message || "Failed to fetch restaurants",
            });
        }
    };
}