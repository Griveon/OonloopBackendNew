import { z } from "zod";

export const loginVendorSchema = z.object({
    email: z
        .email("Invalid email address"),

    password: z
        .string()
        .min(6)
});

const imageSchema = z.object({
    url: z.string().url("Invalid image URL"),
    name: z.string().optional(),
    alt: z.string().optional(),
    isPrimary: z.boolean().optional(),
    position: z.number().optional(),
});

const locationSchema = z.object({
    type: z.literal("Point"),
    coordinates: z
        .array(z.number())
        .length(2, "Coordinates must be [longitude, latitude]"),
});

const storeAddressSchema = z.object({
    addressLine1: z.string().min(1, "Address is required"),
    addressLine2: z.string().optional(),
    landmark: z.string().optional(),

    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().default("India"),

    postalCode: z
        .string()
        .regex(/^\d{4,8}$/, "Invalid postal code"),

    latitude: z.number().optional(),
    longitude: z.number().optional(),

    location: locationSchema,
});

const kycDocumentSchema = z.object({
    fileUrl: z.string().url("Invalid file URL"),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    adminRemark: z.string().optional(),
    updatedAt: z.date().optional(),
});

const bankDetailsSchema = z.object({
    accountHolder: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z
        .string()
        .regex(/^\d{9,18}$/, "Invalid account number")
        .optional(),
    ifsc: z
        .string()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC")
        .optional(),
});

export const createVendorSchema = z.object({
    user: z.string().min(1, "User ID is required"),

    businessType: z.enum([
        "individual",
        "proprietorship",
        "partnership",
        "private_limited",
        "llp",
        "public_limited"
    ]).refine(val => !!val, {
        message: "Business type is required"
    }),

    // 🏪 STORE PROFILE

    storeName: z
        .string()
        .min(2, "Store name must be at least 2 characters"),


    storeLogo: z.string().url().optional(),

    storeImages: z.array(imageSchema).optional(),

    storeLocationAddress: storeAddressSchema,

    gstNumber: z
        .string()
        .regex(
            /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
            "Invalid GST number"
        )
        .optional(),

    panNumber: z
        .string()
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN")
        .optional(),

    workingHours: z
        .object({
            openingTime: z.string(),
            closingTime: z.string(),
        })
        .optional(),

    workingDays: z
        .array(
            z.enum([
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ])
        )
        .optional(),

    bankDetails: bankDetailsSchema.optional(),

    // ❌ REMOVE THIS (KYC comes from separate API)
    // kycDocuments: ...
});

export const updateVendorSchema = createVendorSchema.partial();

export const submitKycSchema = z.object({
    kycDocuments: z.object({
        gstCertificate: kycDocumentSchema.optional(),
        panCard: kycDocumentSchema.optional(),
        cancelledCheque: kycDocumentSchema.optional(),
    }),
});

export const updateVendorStatusSchema = z.object({
    status: z.enum(["pending", "approved", "rejected", "suspended"]),
});