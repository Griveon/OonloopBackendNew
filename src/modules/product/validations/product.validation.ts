import { z } from "zod";

export const createProductSchema = z.object({
    vendorId: z.string().length(24),
    category: z.string().length(24),
    productCategory: z.string().length(24),
    name: z.string().min(2),
    description: z.string().optional(),
    variants: z.array(z.any()).optional(),
    attributes: z.any().optional(),
    images: z.array(z.object({
        url: z.string(),
        name: z.string().optional(),
        alt: z.string().optional(),
        isPrimary: z.boolean().optional(),
        position: z.number().optional(),
    })).optional(),
    mrp: z.number().optional(),
    stock: z.number().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isTrending: z.boolean().optional(),
    returnable: z.boolean().optional(),
    ribbon: z.string().length(24).optional(),
    unit: z.string().length(24).optional(),
    minQty: z.number().optional(),
    slug: z.string().min(2),
    gst: z.any().optional(),
});