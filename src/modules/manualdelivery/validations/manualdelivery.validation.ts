import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const geoCoordinateSchema = z.object({
    latitude: z
        .number()
        .min(-90, "Latitude must be between -90 and 90")
        .max(90, "Latitude must be between -90 and 90"),
    longitude: z
        .number()
        .min(-180, "Longitude must be between -180 and 180")
        .max(180, "Longitude must be between -180 and 180"),
});

export const customerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Customer name must be at least 2 characters")
        .max(100, "Customer name must not exceed 100 characters"),
    mobileNumber: z
        .string()
        .trim()
        .regex(/^[0-9]{10,15}$/, "Mobile number must be 10 to 15 digits"),
    countryCode: z
        .string()
        .trim()
        .regex(/^\+[0-9]{1,4}$/, "Invalid country code, e.g. +91")
        .default("+91"),
    customerId: z
        .string()
        .regex(objectIdRegex, "Invalid customerId format")
        .optional()
        .nullable(),
});

export const dropoffSchema = z.object({
    addressLine1: z
        .string()
        .trim()
        .min(2, "Address line 1 is required")
        .max(255, "Address line 1 must not exceed 255 characters"),
    addressLine2: z
        .string()
        .trim()
        .max(255, "Address line 2 must not exceed 255 characters")
        .optional(),
    area: z
        .string()
        .trim()
        .max(100, "Area must not exceed 100 characters")
        .optional(),
    city: z
        .string()
        .trim()
        .max(100, "City must not exceed 100 characters")
        .optional(),
    state: z
        .string()
        .trim()
        .max(100, "State must not exceed 100 characters")
        .optional(),
    postalCode: z
        .string()
        .trim()
        .max(20, "Postal code must not exceed 20 characters")
        .optional(),
    country: z
        .string()
        .trim()
        .max(100, "Country must not exceed 100 characters")
        .default("India"),
    landmark: z
        .string()
        .trim()
        .max(150, "Landmark must not exceed 150 characters")
        .optional(),
    latitude: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .nullable(),
    longitude: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .nullable(),
    formattedAddress: z
        .string()
        .trim()
        .max(500, "Formatted address must not exceed 500 characters")
        .optional(),
    mapLink: z
        .string()
        .trim()
        .optional()
        .nullable(),
});

// POST /manual-deliveries
export const createManualDeliverySchema = z.object({
    customer: customerSchema,
    dropoff: dropoffSchema,
    customerNotes: z
        .string()
        .trim()
        .max(1000, "Customer notes must not exceed 1000 characters")
        .optional(),
    vendorId: z
        .string()
        .regex(objectIdRegex, "Invalid vendorId format")
        .optional(),
});

// PATCH /manual-deliveries/:id
export const updateManualDeliverySchema = z.object({
    customer: customerSchema.partial().optional(),
    dropoff: dropoffSchema.partial().optional(),
    customerNotes: z
        .string()
        .trim()
        .max(1000, "Customer notes must not exceed 1000 characters")
        .optional(),
});

// POST /manual-deliveries/:id/assign-driver
export const assignDriverSchema = z.object({
    driverId: z
        .string()
        .regex(objectIdRegex, "Valid driverId is required"),
});

// POST /manual-deliveries/:id/cancel
export const cancelDeliverySchema = z.object({
    reason: z
        .string()
        .trim()
        .max(300, "Cancellation reason must not exceed 300 characters")
        .optional(),
});

// POST /manual-deliveries/calculate-distance
export const calculateDistanceSchema = z.object({
    pickup: geoCoordinateSchema.optional(),
    dropoff: z
        .object({
            latitude: z.number().min(-90).max(90).optional(),
            longitude: z.number().min(-180).max(180).optional(),
            mapLink: z.string().trim().optional(),
        })
        .refine(
            (data) =>
                (data.latitude !== undefined && data.longitude !== undefined) ||
                (typeof data.mapLink === "string" && data.mapLink.length > 0),
            {
                message:
                    "Either coordinates (latitude and longitude) or a valid mapLink must be provided",
            }
        ),
});

// Driver endpoints
export const driverStatusUpdateSchema = z.object({
    status: z.enum([
        "PICKED_UP",
        "OUT_FOR_DELIVERY",
        "REACHED",
        "DELIVERED",
        "FAILED",
    ]),
    remark: z
        .string()
        .trim()
        .max(500, "Remark must not exceed 500 characters")
        .optional(),
    failureReason: z
        .string()
        .trim()
        .max(500, "Failure reason must not exceed 500 characters")
        .optional(),
});

export const driverRejectSchema = z.object({
    reason: z
        .string()
        .trim()
        .max(500, "Rejection reason must not exceed 500 characters")
        .optional(),
});
