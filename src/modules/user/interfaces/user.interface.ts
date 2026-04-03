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

    role: UserRole;

    resetPasswordToken?: string;
    resetPasswordExpire?: Date;

    lastLogin?: Date;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document { }