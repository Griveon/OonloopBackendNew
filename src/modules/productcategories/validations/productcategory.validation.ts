import { z } from "zod";

const categoryLevelSchema = z.object({
    name: z.string().min(2),
    code: z.string().min(2),
});

export const createProductCategorySchema = z.object({
    vendorCategory: z.string().length(24),

    l1Category: categoryLevelSchema,
    l2Category: categoryLevelSchema,
    l3Category: categoryLevelSchema,
    l4Category: categoryLevelSchema,

    icon: z.string().optional(),
});

export const updateProductCategorySchema = z.object({
    l1Category: categoryLevelSchema.optional(),
    l2Category: categoryLevelSchema.optional(),
    l3Category: categoryLevelSchema.optional(),
    l4Category: categoryLevelSchema.optional(),
    icon: z.string().optional(),
    isActive: z.boolean().optional(),
}).strict();