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

        role: {
            type: String,
            enum: ["user", "vendor", "driver"],
            required: true,
            default: "user",
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
    },
    {
        timestamps: true,
    }
);

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>(
    "User",
    UserSchema
);