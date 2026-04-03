import { z } from "zod";

export const createFeatureSchema = z.object({

    name: z
        .string()
        .min(2, "Feature name must be at least 2 characters")
        .max(100)
        .transform(val => val.trim()),

    description: z
        .string()
        .max(255)
        .optional(),

    type: z.enum(["number", "boolean"]),
});


export const updateFeatureSchema = z.object({

    name: z
        .string()
        .min(2)
        .max(100)
        .transform(val => val.trim())
        .optional(),

    description: z
        .string()
        .max(255)
        .optional(),

    type: z.enum(["number", "boolean"]).optional(),

    isActive: z.boolean().optional(),
}).strict();