import { z } from "zod";

const additionalHandlingSchema = z.object({
    enabled: z.boolean().optional(),
    percentage: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
}).strict();

export const createVendorCategorySchema = z.object({
    name: z.string().min(2).max(100).trim(),
    additionalHandling: additionalHandlingSchema.optional(),
});

export const updateVendorCategorySchema = z.object({
    name: z.string().min(2).max(100).trim().optional(),
    additionalHandling: additionalHandlingSchema.optional(),
    isActive: z.boolean().optional(),
}).strict();
