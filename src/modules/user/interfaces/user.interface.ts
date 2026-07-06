import { Document } from "mongoose";

export type UserStatus = "active" | "inactive" | "suspended";
export type Gender = "male" | "female" | "other";
export type UserRole = "user" | "vendor" | "driver";

export interface IUser {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    mobileNumber?: string;
    dateOfBirth?: Date;
    gender?: Gender;

    status: UserStatus;

    isEmailVerified: boolean;
    emailVerificationToken?: string;

    role?: UserRole;
    pin: string;

    resetPasswordToken?: string;
    roles?: UserRole[];
    resetPasswordExpire?: Date;

    lastLogin?: Date;

    createdAt?: Date;
    updatedAt?: Date;
    otp: String,
    otpExpiry: Number,
}

export interface IUserDocument extends IUser, Document { }