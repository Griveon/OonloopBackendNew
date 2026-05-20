import { ProductRepository } from "../repositories/product.repository.js";
import type { IProduct } from "../interfaces/product.interface.js";
import { ProductModel } from "../models/product.model.js";
import slugify from "slugify";

export class ProductService {
    private repo: ProductRepository;

    constructor() {
        this.repo = new ProductRepository();
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

    async create(data: IProduct) {
        const slug = await this.generateUniqueSlug(data.name);

        return await this.repo.create({
            ...data,
            slug,
        });
    }


    async getById(id: string) {
        const product = await this.repo.findById(id);
        if (!product) throw new Error("Product not found");
        return product;
    }

    async getAll(page = 1, limit = 10, filter: any = {}) {
        return await this.repo.findAll(filter, page, limit);
    }

    async getAllByVendor(page = 1, limit = 10, filter: any = {}) {
        return this.repo.findByVendor(filter, page, limit);
    }

    async update(id: string, data: Partial<IProduct>) {
        const existing = await this.repo.findById(id);
        if (!existing) throw new Error("Product not found");

        const updatePayload: any = { ...data };

        // Remove array fields — handled separately below
        delete updatePayload.images;
        delete updatePayload.videos;
        delete updatePayload.variants;

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
        if (Array.isArray(data.variants)) {
            const safeVariants = data.variants.map((v: any) => ({
                // Preserve _id so Mongoose doesn't regenerate it on replace
                ...(v._id ? { _id: v._id } : {}),

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
                sku: v.sku,
                price: Number(v.price || 0),
                mrp: Number(v.mrp || 0),
            }));

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


}