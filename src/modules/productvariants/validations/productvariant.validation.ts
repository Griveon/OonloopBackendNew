import { z } from "zod";

const optionSchema = z.object({
    value: z.string(),
    label: z.string(),
    meta: z.any().optional(),
});

export const createVariantSchema = z.object({
    name: z.string().min(2),
    label: z.string(),

    inputType: z.enum(["text", "number", "select", "color"]),

    options: z.array(optionSchema).optional(),

    isRequired: z.boolean().optional(),
    isFilterable: z.boolean().optional(),
    isGlobal: z.boolean().optional(),
});

export const updateVariantSchema = createVariantSchema
    .partial()
    .extend({
        isActive: z.boolean().optional(),
    });