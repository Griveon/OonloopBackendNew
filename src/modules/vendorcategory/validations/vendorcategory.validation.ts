import { z } from "zod";

export const createVendorCategorySchema = z.object({
    name: z.string().min(2).max(100).trim(),
});

export const updateVendorCategorySchema = z.object({
    name: z.string().min(2).max(100).trim().optional(),
    isActive: z.boolean().optional(),
}).strict();