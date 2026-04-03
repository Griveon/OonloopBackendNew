import { z } from "zod";

export const createPlanFeatureSchema = z.object({
    plan: z
        .string()
        .length(24, "Invalid plan ID")
        .transform(val => val.trim()),

    feature: z
        .string()
        .length(24, "Invalid feature ID")
        .transform(val => val.trim()),

    value: z.any(), // You could refine this further if needed
});

export const updatePlanFeatureSchema = z.object({
    plan: z
        .string()
        .length(24, "Invalid plan ID")
        .transform(val => val.trim())
        .optional(),

    feature: z
        .string()
        .length(24, "Invalid feature ID")
        .transform(val => val.trim())
        .optional(),

    value: z.any().optional(),

    isActive: z.boolean().optional(),
}).strict();