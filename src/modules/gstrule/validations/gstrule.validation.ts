import { z } from "zod";

export const createGSTRuleSchema = z.object({
    hsnCode: z.string().min(2),
    hsnDescription: z.string().min(2),
    igst: z.number().min(0),
    cgst: z.number().min(0),
    sgst: z.number().min(0),
    isActive: z.boolean().optional(),
});

export const updateGSTRuleSchema = createGSTRuleSchema.partial();