import { z } from "zod";

const conditionSchema = z.object({
    field: z.string(),
    operator: z.enum(["gt", "lt", "eq", "gte", "lte"]),
    value: z.any(),
});

export const createRibbonSchema = z.object({
    title: z.string().min(2),

    type: z.enum(["manual", "auto", "system"]).optional(),

    color: z.string().optional(),
    textColor: z.string().optional(),

    position: z
        .enum(["top-left", "top-right", "bottom-left", "bottom-right"])
        .optional(),

    priority: z.number().optional(),

    expiresAt: z.string().datetime().optional(),

    isGlobal: z.boolean().optional(),

    conditions: z.array(conditionSchema).optional(),
});

export const updateRibbonSchema = createRibbonSchema
    .partial()
    .extend({
        isActive: z.boolean().optional(),
    });