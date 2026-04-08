import { z } from "zod";

export const createUnitSchema = z.object({
    name: z.string().min(2),
    shortName: z.string().min(1),
    unitValue: z.number().min(0).optional(),
    symbol: z.string().min(1),
    description: z.string().optional(),
});

export const updateUnitSchema = z.object({
    name: z.string().min(2).optional(),
    shortName: z.string().min(1).optional(),
    unitValue: z.number().min(0).optional(),
    symbol: z.string().min(1).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
}).strict();