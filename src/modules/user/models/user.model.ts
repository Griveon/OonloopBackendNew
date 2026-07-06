import mongoose, { Schema, Model } from "mongoose";
import type { IUserDocument } from "../interfaces/user.interface.js";

const UserSchema: Schema<IUserDocument> = new Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        mobileNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },

        dateOfBirth: {
            type: Date,
        },

        gender: {
            type: String,
            enum: ["male", "female", "other"],
        },

        password: {
            type: String,
            required: true,
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
        },

        pin: {
            type: String,
            required: false,
            trim: true,
            minlength: 6,
            maxlength: 6,
        },

        role: {
            type: String,
            enum: ["user", "vendor", "driver"],
            required: true,
            default: "user",
        },

        roles: {
            type: [String],
            enum: ["user", "vendor", "driver"],
            default: ["user"],
        },


        resetPasswordToken: {
            type: String,
        },

        resetPasswordExpire: {
            type: Date,
        },

        lastLogin: {
            type: Date,
        },
        otp: { type: String },
        otpExpiry: { type: Number },
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
});

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>(
    "User",
    UserSchema
);