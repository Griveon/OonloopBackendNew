import { z } from "zod";

export const createPlanSchema = z.object({
    name: z
        .string()
        .min(2, "Plan key must be at least 2 characters")
        .max(50, "Plan key cannot exceed 50 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscore allowed")
        .transform(val => val.toLowerCase().trim()),

    displayName: z
        .string()
        .min(2, "Display name must be at least 2 characters")
        .max(100, "Display name cannot exceed 100 characters")
        .transform(val => val.trim()),

    description: z
        .string()
        .max(255, "Description cannot exceed 255 characters")
        .optional(),

    price: z
        .number()
        .min(0, "Price must be greater than or equal to 0"),

    currency: z
        .string()
        .length(24, "Invalid currency ID"),

    billingCycle: z
        .enum(["monthly", "yearly"])
        .default("monthly"),

    isActive: z.boolean().optional(),
});

export const updatePlanSchema = z.object({
    name: z
        .string()
        .min(2, "Plan key must be at least 2 characters")
        .max(50, "Plan key cannot exceed 50 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscore allowed")
        .transform(val => val.toLowerCase().trim())
        .optional(),

    displayName: z
        .string()
        .min(2, "Display name must be at least 2 characters")
        .max(100, "Display name cannot exceed 100 characters")
        .transform(val => val.trim())
        .optional(),

    description: z.string().max(255, "Description cannot exceed 255 characters").optional(),

    price: z
        .number()
        .min(0, "Price must be greater than or equal to 0")
        .optional(),

    currency: z
        .string()
        .length(24, "Invalid currency ID")
        .optional(),

    billingCycle: z.enum(["monthly", "yearly"]).optional(),

    isActive: z.boolean().optional(),
}).strict();