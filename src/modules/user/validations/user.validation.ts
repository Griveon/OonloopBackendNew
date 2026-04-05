import { z } from "zod";

export const signupSchema = z.object({
    firstName: z
        .string()
        .min(2, "First name must be at least 2 characters")
        .max(50),

    lastName: z
        .string()
        .max(50)
        .optional(),

    email: z
        .string()
        .email("Invalid email address"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(100),

    mobileNumber: z
        .string()
        .min(10, "Mobile number must be at least 10 digits")
        .max(15, "Mobile number can be maximum 15 digits")
        .optional(),

    dateOfBirth: z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(new Date(val).getTime()), {
            message: "Invalid date of birth"
        }),

    gender: z
        .enum(["male", "female", "other"])
        .optional(),

    pin: z.string()
});


/**
 * Login Validation
 */
// export const loginSchema = z.object({
//     email: z
//         .email("Invalid email address"),

//     password: z
//         .string()
//         .min(6)
// });


/**
 * Forgot Password Validation
 */
export const forgotPasswordSchema = z.object({
    email: z
        .email("Invalid email address")
});


/**
 * Reset Password Validation
 */
export const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
});