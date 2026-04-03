import { z } from "zod";

// Create Workspace Schema
export const createWorkspaceSchema = z.object({
    name: z
        .string()
        .min(2, "Workspace name must be at least 2 characters")
        .max(100, "Workspace name cannot exceed 100 characters")
        .transform(val => val.trim()),

    key: z
        .string()
        .min(2, "Workspace key must be at least 2 characters")
        .max(50, "Workspace key cannot exceed 50 characters")
        .optional() // optional if you generate it automatically
        .transform(val => val?.trim()),

    description: z
        .string()
        .max(255, "Description cannot exceed 255 characters")
        .optional(),

    owner: z
        .string()
        .length(24, "Invalid owner ID"), // Mongo ObjectId


    isActive: z.boolean().optional().default(true),
});

export const updateWorkspaceSchema = z.object({
    name: z
        .string()
        .min(2, "Workspace name must be at least 2 characters")
        .max(100, "Workspace name cannot exceed 100 characters")
        .transform(val => val.trim())
        .optional(),

    description: z.string().max(255, "Description cannot exceed 255 characters").optional(),

    owner: z.string().length(24, "Invalid owner ID").optional(),

    isActive: z.boolean().optional(),
}).strict();