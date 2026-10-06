import { z } from "zod";

export const platformParamSchema = z.object({
    platform: z.enum(["android", "ios"]),
});

export const checkVersionQuerySchema = z.object({
    platform: z.enum(["android", "ios"]),
    version: z.string().trim().optional(),
    buildNumber: z.coerce
        .number()
        .int("buildNumber must be an integer")
        .min(1, "buildNumber must be at least 1"),
});

export const createOrUpdateAppVersionSchema = z
    .object({
        latestVersion: z
            .string()
            .trim()
            .min(1, "latestVersion is required"),
        latestBuildNumber: z
            .number()
            .int("latestBuildNumber must be an integer")
            .min(1, "latestBuildNumber must be at least 1"),
        minimumSupportedVersion: z
            .string()
            .trim()
            .min(1, "minimumSupportedVersion is required"),
        minimumSupportedBuildNumber: z
            .number()
            .int("minimumSupportedBuildNumber must be an integer")
            .min(1, "minimumSupportedBuildNumber must be at least 1"),
        forceUpdate: z.boolean().optional().default(false),
        storeUrl: z.string().trim().optional(),
        message: z.string().trim().optional(),
        isActive: z.boolean().optional().default(true),

        // Extensible fields for forward-compatibility
        maintenanceMode: z.boolean().optional(),
        recommendedUpdate: z.boolean().optional(),
        rolloutPercentage: z.number().min(0).max(100).optional(),
        deprecatedBuilds: z.array(z.number().int()).optional(),
    })
    .passthrough()
    .refine(
        (data) => data.minimumSupportedBuildNumber <= data.latestBuildNumber,
        {
            message: "minimumSupportedBuildNumber cannot be greater than latestBuildNumber",
            path: ["minimumSupportedBuildNumber"],
        }
    );

export type CreateOrUpdateAppVersionInput = z.infer<typeof createOrUpdateAppVersionSchema>;
export type CheckVersionQueryInput = z.infer<typeof checkVersionQuerySchema>;
