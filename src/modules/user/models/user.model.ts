import mongoose, { Schema, Model } from "mongoose";
import type { IUserDocument } from "../interfaces/user.interface.js";

const UserSchema: Schema<IUserDocument> = new Schema(
    {
        firstName: {
            type: String,
            trim: true,
            default: null,
        },

        lastName: {
            type: String,
            trim: true,
            default: null,
        },

        email: {
            type: String,
            lowercase: true,
            trim: true,
            default: undefined,
            set: (value: string) => {
                if (!value || value.trim() === "") {
                    return undefined;
                }
                return value.toLowerCase().trim();
            },
        },

        mobileNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            required: false,
        },

        dateOfBirth: {
            type: Date,
            default: null,
        },

        gender: {
            type: String,
            enum: ["male", "female", "other"],
            default: null,
        },

        password: {
            type: String,
        },

        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
        },

        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        emailVerificationToken: {
            type: String,
            default: null,
        },

        pin: {
            type: String,
            trim: true,
            minlength: 6,
            maxlength: 6,
            default: null,
        },

        role: {
            type: String,
            enum: ["admin", "user", "vendor", "driver"],
            required: true,
            default: "user",
        },

        roles: {
            type: [String],
            enum: ["admin", "user", "vendor", "driver"],
            default: ["user"],
        },

        resetPasswordToken: {
            type: String,
            default: null,
        },

        resetPasswordExpire: {
            type: Date,
            default: null,
        },

        lastLogin: {
            type: Date,
            default: null,
        },

        otp: {
            type: String,
            default: null,
        },

        otpExpiry: {
            type: Number,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

UserSchema.pre("save", function (next) {
    const user = this as any;

    if (!Array.isArray(user.roles) || user.roles.length === 0) {
        user.roles = [user.role || "user"];
    }

    if (user.role && !user.roles.includes(user.role)) {
        user.roles.push(user.role);
    }

    user.roles = [...new Set(user.roles)];

    // next();
});

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>(
    "User",
    UserSchema
);