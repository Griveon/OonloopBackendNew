import { z } from "zod";

const imageSchema = z.object({
    url: z.string().url(),
    name: z.string().optional(),
    alt: z.string().optional(),
    isPrimary: z.boolean().optional(),
    position: z.number().optional(),
});

export const createBrandSchema = z.object({
    name: z.string().min(2).max(100).trim(),
    slug: z.string().optional(),
    vendorId: z.string().optional(),
    description: z.string().optional(),

    logo: imageSchema.optional(),
    banners: z.array(imageSchema).optional(),

    website: z.string().url().optional(),

    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),

    tags: z.array(z.string()).optional(),

    isFeatured: z.boolean().optional(),
});

export const updateBrandSchema = createBrandSchema
    .partial()
    .extend({
        isActive: z.boolean().optional(),
    })
    .strict();