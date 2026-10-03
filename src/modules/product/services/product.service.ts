import { ProductRepository } from "../repositories/product.repository.js";
import type { IProduct } from "../interfaces/product.interface.js";
import { ProductModel } from "../models/product.model.js";
import { VendorCategoryModel } from "../../vendorcategory/models/vendorcategory.model.js";
import slugify from "slugify";
import { CartModel } from "../../cart/models/cart.model.js";
import {
    calculateProductHandling,
    getDefaultAdditionalHandlingSnapshot,
    type IAdditionalHandlingConfig,
} from "../utils/pricing.util.js";

export class ProductService {
    private repo: ProductRepository;

    constructor() {
        this.repo = new ProductRepository();
    }

    async calculateHandling(
        sellingPrice: number | string,
        mrp: number | string,
        categoryId?: any
    ) {
        const additionalHandling = await this.getCategoryAdditionalHandling(categoryId);
        return calculateProductHandling(sellingPrice, mrp, additionalHandling);
    }

    private async getCategoryAdditionalHandling(
        categoryId: any
    ): Promise<IAdditionalHandlingConfig | null> {
        if (!categoryId) {
            return null;
        }

        const category = await VendorCategoryModel.findById(categoryId)
            .select("additionalHandling")
            .lean();

        return category?.additionalHandling ?? null;
    }


    private async generateUniqueSlug(name: string): Promise<string> {
        const baseSlug = slugify(name, {
            lower: true,
            strict: true,
            trim: true,
        });

        let slug = baseSlug;
        let counter = 1;

        while (await ProductModel.exists({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    async create(data: any) {
        const slug = await this.generateUniqueSlug(data.name);

        // =========================================================
        // 1️⃣ CLEAN IMAGES (ONLY CDN URLs)
        // =========================================================
        const safeImages = Array.isArray(data.images)
            ? data.images
                .filter((img: any) => {
                    const url = img.url || img.uri || "";
                    return url.startsWith("http");
                })
                .map((img: any) => ({
                    url: img.url || img.uri,
                    name: img.name || "",
                    alt: img.alt || "",
                    isPrimary: img.isPrimary || false,
                    position: img.position || 0,
                }))
            : [];

        const additionalHandling = await this.getCategoryAdditionalHandling(data.category);

        // =========================================================
        // 2️⃣ CLEAN VIDEOS (ONLY CDN URLs)
        // =========================================================
        const safeVideos = Array.isArray(data.videos)
            ? data.videos
                .filter((v: any) => {
                    const url = v.url || v.uri || "";
                    return url.startsWith("http");
                })
                .map((v: any) => ({
                    url: v.url || v.uri,
                    name: v.name || "",
                    type: v.type || "",
                    isPrimary: v.isPrimary || false,
                    position: v.position || 0,
                }))
            : [];

        // =========================================================
        // 3️⃣ CLEAN VARIANTS
        // =========================================================
        const safeVariants = Array.isArray(data.variants)
            ? data.variants.map((v: any) => {
                const price = Number(v.price || 0);
                const mrp = Number(v.mrp || 0);
                let handlingCharges = Number(v.productHandlingCharges || 0);
                let productHandling = Number(v.productHandling || handlingCharges);
                let customerSellingPrice = Number(v.customerSellingPrice || price);
                let variantAdditionalHandling = getDefaultAdditionalHandlingSnapshot();

                if (price > 0 && mrp > 0 && price > mrp) {
                    throw new Error("Selling price cannot exceed MRP");
                }

                if (price > 0 && mrp >= price) {
                    const calculated = calculateProductHandling(price, mrp, additionalHandling);
                    handlingCharges = calculated.productHandlingCharges;
                    productHandling = calculated.productHandling;
                    customerSellingPrice = calculated.customerSellingPrice;
                    variantAdditionalHandling = calculated.additionalHandling;
                } else if (price > 0 && !mrp) {
                    customerSellingPrice = price;
                }

                return {
                    ...(v._id ? { _id: v._id } : {}),

                    variantId: v.variantId,
                    attributes: v.attributes || {},

                    unit: v.unit,
                    unitValue: Number(v.unitValue || 0),
                    stock: Number(v.stock || 0),
                    sku: v.sku,
                    price,
                    customerSellingPrice,
                    mrp,
                    productSpecification: v.productSpecification,
                    productHandlingCharges: handlingCharges,
                    productHandling,
                    additionalHandling: variantAdditionalHandling,
                    // Images handled by upload API
                    images: [],
                };
            })
            : [];

        // =========================================================
        // 4️⃣ NORMALIZE AVAILABILITY
        // =========================================================
        const availability = this.normalizeAvailability(data);

        console.log("✅ Normalized Availability:", availability);

        // =========================================================
        // 5️⃣ BUILD FINAL PRODUCT
        // =========================================================
        let rootCustomerSellingPrice = data.customerSellingPrice;
        let rootProductHandlingCharges = data.productHandlingCharges;
        let rootProductHandling = data.productHandling;
        let rootAdditionalHandling = getDefaultAdditionalHandlingSnapshot();
        if (data.price !== undefined && data.price !== null) {
            const rootPrice = Number(data.price || 0);
            const rootMrp = Number(data.mrp || 0);
            if (rootPrice > 0 && rootMrp > 0 && rootPrice > rootMrp) {
                throw new Error("Selling price cannot exceed MRP");
            }

            if (rootPrice > 0 && rootMrp >= rootPrice) {
                const calc = calculateProductHandling(rootPrice, rootMrp, additionalHandling);
                rootCustomerSellingPrice = calc.customerSellingPrice;
                rootProductHandlingCharges = calc.productHandlingCharges;
                rootProductHandling = calc.productHandling;
                rootAdditionalHandling = calc.additionalHandling;
            } else {
                rootCustomerSellingPrice = rootPrice;
            }
        }

        const productPayload = {
            ...data,

            slug,

            availability,

            isMainCatalogProduct: data.isMainCatalogProduct ?? true,

            images: safeImages,
            videos: safeVideos,
            variants: safeVariants,
            ...(rootCustomerSellingPrice !== undefined ? { customerSellingPrice: rootCustomerSellingPrice } : {}),
            ...(rootProductHandlingCharges !== undefined ? { productHandlingCharges: rootProductHandlingCharges } : {}),
            ...(rootProductHandling !== undefined ? { productHandling: rootProductHandling } : {}),
            additionalHandling: rootAdditionalHandling,
        };

        console.log("📦 Final Product Payload Availability:", productPayload.availability);

        return await this.repo.create(productPayload);
    }


    async getById(id: string, userId?: string) {
        const product = await this.repo.findById(id);

        if (!product) {
            throw new Error("Product not found");
        }

        let cartInfo = {
            isAdded: false,
            quantity: 0,
            cartItemId: null,
        };

        if (userId) {
            const cart = await CartModel.findOne({
                user: userId,
                "items.product": id,
            });

            if (cart) {
                const item: any = cart.items.find(
                    (i: any) => i.product.toString() === id
                );

                if (item) {
                    cartInfo = {
                        isAdded: true,
                        quantity: item.quantity,
                        cartItemId: item._id,
                    };
                }
            }
        }

        const productObj = (product as any).toObject ? (product as any).toObject() : product;
        if (productObj.customerSellingPrice === undefined && productObj.price !== undefined) {
            productObj.customerSellingPrice = productObj.price;
        }
        if (Array.isArray(productObj.variants)) {
            productObj.variants = productObj.variants.map((v: any) => ({
                ...v,
                customerSellingPrice: v.customerSellingPrice ?? v.price,
            }));
        }

        return {
            ...productObj,
            cart: cartInfo,
        };
    }

    async getAll(page = 1, limit = 10, filter: any = {}) {
        return await this.repo.findAll(filter, page, limit);
    }

    async getAllByVendor(page = 1, limit = 10, filter: any = {}) {
        return this.repo.findByVendor(filter, page, limit);
    }

    async searchMainCatalog(
        keyword: string,
        page = 1,
        limit = 10
    ) {
        return this.repo.searchMainCatalog(keyword, page, limit);
    }

    async update(id: string, data: Partial<IProduct>) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Product not found");

        const updatePayload: any = { ...data };

        console.log(updatePayload)

        if (data.availability) {
            updatePayload.availability = this.normalizeAvailability(data);
        }

        // Remove array fields — handled separately below
        delete updatePayload.images;
        delete updatePayload.videos;
        delete updatePayload.variants;

        const pricingCategoryId = updatePayload.category ?? existing.category;
        const additionalHandling = await this.getCategoryAdditionalHandling(pricingCategoryId);

        if (
            updatePayload.price !== undefined ||
            updatePayload.mrp !== undefined ||
            updatePayload.category !== undefined
        ) {
            const rootPrice = Number(updatePayload.price ?? existing.price ?? 0);
            const rootMrp = Number(updatePayload.mrp ?? existing.mrp ?? 0);
            if (rootPrice > 0 && rootMrp > 0 && rootPrice > rootMrp) {
                throw new Error("Selling price cannot exceed MRP");
            }

            if (rootPrice > 0 && rootMrp >= rootPrice) {
                const calc = calculateProductHandling(rootPrice, rootMrp, additionalHandling);
                updatePayload.customerSellingPrice = calc.customerSellingPrice;
                updatePayload.productHandlingCharges = calc.productHandlingCharges;
                updatePayload.productHandling = calc.productHandling;
                updatePayload.additionalHandling = calc.additionalHandling;
            } else {
                updatePayload.customerSellingPrice = rootPrice;
                updatePayload.additionalHandling = getDefaultAdditionalHandlingSnapshot();
            }
        }

        // 1️⃣ UPDATE SCALAR FIELDS ONLY
        if (Object.keys(updatePayload).length > 0) {
            await ProductModel.updateOne({ _id: id }, { $set: updatePayload });
        }

        // 2️⃣ IMAGES → only persist already-uploaded (real URL) images
        //    New images arrive via /upload/product-image which $pushes them separately.
        //    We only manage ordering/alt/isPrimary of existing ones here.
        if (Array.isArray(data.images)) {
            const safeImages = data.images
                .filter((img: any) => {
                    const url = img.url || img.uri || "";
                    return url.startsWith("http"); // skip file:// or empty
                })
                .map((img: any) => ({
                    url: img.url || img.uri,
                    name: img.name || "",
                    alt: img.alt || "",
                    isPrimary: img.isPrimary || false,
                    position: img.position || 0,
                }));

            await ProductModel.updateOne(
                { _id: id },
                { $set: { images: safeImages } }
            );
        }

        // 3️⃣ VIDEOS → same pattern as images
        if (Array.isArray(data.videos)) {
            const safeVideos = data.videos
                .filter((v: any) => {
                    const url = v.url || v.uri || "";
                    return url.startsWith("http");
                })
                .map((v: any) => ({
                    url: v.url || v.uri,
                    name: v.name || "",
                    type: v.type || "",
                    isPrimary: v.isPrimary || false,
                    position: v.position || 0,
                }));

            await ProductModel.updateOne(
                { _id: id },
                { $set: { videos: safeVideos } }
            );
        }

        // 4️⃣ VARIANTS → replace scalar fields + preserve/filter existing images only.
        //    New variant images arrive via /upload/variant-image which $pushes them.
        const variantsToPrice = Array.isArray(data.variants)
            ? data.variants
            : updatePayload.category !== undefined
                ? existing.variants
                : null;

        if (Array.isArray(variantsToPrice)) {
            const safeVariants = variantsToPrice.map((v: any) => {
                const price = Number(v.price || 0);
                const mrp = Number(v.mrp || 0);
                let handlingCharges = Number(v.productHandlingCharges || 0);
                let productHandling = Number(v.productHandling || handlingCharges);
                let customerSellingPrice = Number(v.customerSellingPrice || price);
                let variantAdditionalHandling = getDefaultAdditionalHandlingSnapshot();

                if (price > 0 && mrp > 0 && price > mrp) {
                    throw new Error("Selling price cannot exceed MRP");
                }

                if (price > 0 && mrp >= price) {
                    const calculated = calculateProductHandling(price, mrp, additionalHandling);
                    handlingCharges = calculated.productHandlingCharges;
                    productHandling = calculated.productHandling;
                    customerSellingPrice = calculated.customerSellingPrice;
                    variantAdditionalHandling = calculated.additionalHandling;
                } else if (price > 0 && !mrp) {
                    customerSellingPrice = price;
                }

                return {
                    // Preserve _id so Mongoose doesn't regenerate it on replace
                    ...(v._id ? { _id: v._id } : {}),

                    variantId: v.variantId,
                    attributes: v.attributes || {},

                    // Only keep images that are already on CDN (real URLs)
                    // New ones will be $pushed by the upload endpoint after this returns
                    images: (v.images || [])
                        .filter((img: any) => {
                            const url = img.url || img.uri || "";
                            return url.startsWith("http");
                        })
                        .map((img: any) => ({
                            url: img.url || img.uri,
                            name: img.name || "",
                            alt: img.alt || "",
                            isPrimary: img.isPrimary || false,
                            position: img.position || 0,
                        })),

                    unit: v.unit,
                    unitValue: Number(v.unitValue || 0),
                    stock: Number(v.stock || 0),
                    productSpecification: v.productSpecification,
                    productHandlingCharges: handlingCharges,
                    productHandling,
                    additionalHandling: variantAdditionalHandling,
                    sku: v.sku,
                    price,
                    customerSellingPrice,
                    mrp,
                };
            });

            await ProductModel.updateOne(
                { _id: id },
                { $set: { variants: safeVariants } }
            );
        }

        return await this.repo.findById(id);
    }

    async delete(id: string) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Product not found");
        return await this.repo.delete(id);
    }

    async toggleStatus(id: string, isActive: boolean) {
        const product = await this.repo.findById(id);
        if (!product) throw new Error("Product not found");

        return await this.repo.update(id, { isActive });
    }

    async updateQuantity(
        id: string,
        type: "increase" | "decrease",
        qty: number,
        variantId?: string
    ) {
        const product = await this.repo.findById(id);
        if (!product) throw new Error("Product not found");

        const change = type === "increase" ? qty : -qty;

        // ✅ CASE 1: Variant stock update
        if (variantId) {
            await ProductModel.updateOne(
                { _id: id, "variants._id": variantId },
                {
                    $inc: {
                        "variants.$.stock": change
                    }
                }
            );
        }
        // ✅ CASE 2: Global stock update
        else {
            await ProductModel.updateOne(
                { _id: id },
                { $inc: { stock: change } }
            );
        }

        return await this.repo.findById(id);
    }

    async searchByVendor(
        vendorId: string,
        search: string,
        page = 1,
        limit = 10
    ) {
        return this.repo.searchByVendor(
            vendorId,
            search,
            page,
            limit
        );
    }

    async getRecentProductsByPincode(pincode: string, limit = 50) {
        if (!pincode?.trim()) {
            throw new Error("pincode is required");
        }

        return this.repo.findRecentByPincode(pincode.trim(), limit);
    }

    async getVendorCouponProducts(
        couponId: any,
        page = 1,
        limit = 10
    ) {
        const coupon = await this.repo.findByCouponId(couponId);

        if (!coupon) {
            throw new Error("Coupon not found");
        }

        const result = await this.repo.getVendorCouponProducts(
            coupon.vendorId.toString(),
            page,
            limit
        );

        return {
            coupon,
            products: result.items,
            total: result.total,
            page: result.page,
            limit: result.limit,
        };
    }

    private isValidTime(time: string): boolean {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
    }

    private timeToMinutes(time: string): number {
        let [hours, minutes]: any = time.split(":").map(Number);
        return hours * 60 + minutes;
    }

    private normalizeAvailability(data: any) {
        const availability = data?.availability || {};
        console.log("availability");
        console.log(availability);

        const type = availability.type || "always";

        if (type === "always") {
            return {
                type: "always",
                fromTime: "",
                toTime: "",
                fromMinutes: null,
                toMinutes: null,
            };
        }

        if (type !== "scheduled") {
            throw new Error("Invalid availability type");
        }

        const fromTime = availability.fromTime;
        const toTime = availability.toTime;

        if (!fromTime || !toTime) {
            throw new Error("Availability fromTime and toTime are required");
        }

        if (!this.isValidTime(fromTime) || !this.isValidTime(toTime)) {
            throw new Error("Availability time must be in HH:mm format");
        }

        return {
            type: "scheduled",
            fromTime,
            toTime,
            fromMinutes: this.timeToMinutes(fromTime),
            toMinutes: this.timeToMinutes(toTime),
        };
    }
}
