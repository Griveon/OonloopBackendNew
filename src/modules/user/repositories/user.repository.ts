import { UserModel } from "../models/user.model.js";
import type { IUser } from "../interfaces/user.interface.js";
import { DriverProfileModel } from "../../driverprofile/models/driverprofile.model.js";
import { UserProfileModel } from "../../userprofile/models/userprofile.model.js";
import { VendorProfileModel } from "../../vendorprofile/models/vendorprofile.model.js";

type UserRole = "admin" | "user" | "vendor" | "driver";

export class UserRepository {
    async createUser(data: Partial<IUser>) {
        return await UserModel.create(data);
    }

    async findByEmail(email: string) {
        return await UserModel.findOne({
            email: email.toLowerCase().trim(),
        });
    }

    async findByMobileNumber(mobileNumber: string) {
        return await UserModel.findOne({
            mobileNumber: mobileNumber.trim(),
        });
    }

    async findById(id: string) {
        return await UserModel.findById(id);
    }

    async updateLastLogin(userId: string) {
        return await UserModel.findByIdAndUpdate(
            userId,
            {
                lastLogin: new Date(),
            },
            {
                new: true,
            }
        );
    }

    async updatePassword(userId: string, password: string) {
        return await UserModel.findByIdAndUpdate(
            userId,
            {
                password,
            },
            {
                new: true,
            }
        );
    }

    async updateProfile(userId: string, data: Partial<IUser>) {
        return await UserModel.findByIdAndUpdate(
            userId,
            {
                $set: data,
            },
            {
                new: true,
                runValidators: true,
            }
        ).select("-password");
    }

    async updateOtp(userId: string, otp: string, expiry: number) {
        return await UserModel.findByIdAndUpdate(
            userId,
            {
                otp,
                otpExpiry: expiry,
            },
            {
                new: true,
            }
        );
    }

    async findByOtp(userId: string, otp: string) {
        return await UserModel.findOne({
            _id: userId,
            otp,
            otpExpiry: {
                $gt: Date.now(),
            },
        });
    }

    async clearOtp(userId: string) {
        return await UserModel.findByIdAndUpdate(
            userId,
            {
                $unset: {
                    otp: "",
                    otpExpiry: "",
                },
            },
            {
                new: true,
            }
        );
    }

    async updatePinByMobile(mobileNumber: string, pin: string) {
        return await UserModel.findOneAndUpdate(
            {
                mobileNumber: mobileNumber.trim(),
            },
            {
                $set: {
                    pin,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );
    }

    async findDriverProfileByUserId(userId: string) {
        return await DriverProfileModel.findOne({
            user: userId,
        });
    }

    /**
     * Permanently remove the known MongoDB documents owned by a user.
     *
     * Important:
     * - User is deleted LAST.
     * - This keeps the root account present if one of the related-profile
     *   deletions throws an error.
     * - Physical files stored in S3 / Cloudinary / Spaces are NOT removed
     *   here because storage-provider code is not part of this repository.
     */
    async deleteAccountData(userId: string) {
        await UserProfileModel.deleteMany({
            user: userId,
        });

        await VendorProfileModel.deleteMany({
            user: userId,
        });

        await DriverProfileModel.deleteMany({
            user: userId,
        });

        const deletedUser =
            await UserModel.findByIdAndDelete(userId);

        if (!deletedUser) {
            throw new Error("User not found");
        }

        return {
            deleted: true,
        };
    }

    /**
     * Add new role to existing user.
     *
     * Example:
     * Existing: role = "user", roles = ["user"]
     * Signup as vendor:
     * Updated: role = "vendor", roles = ["user", "vendor"]
     */
    async addRoleToUser(userId: string, role: UserRole) {
        return await UserModel.findByIdAndUpdate(
            userId,
            {
                $set: {
                    role,
                },
                $addToSet: {
                    roles: role,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );
    }

    async updateUserBasicInfoIfMissing(
        userId: string,
        data: {
            mobileNumber?: string;
            dateOfBirth?: Date | string;
            gender?: "male" | "female" | "other";
            pin?: string;
        }
    ) {
        const updateData: Partial<IUser> = {};

        if (data.mobileNumber) {
            updateData.mobileNumber = data.mobileNumber.trim();
        }

        if (data.dateOfBirth) {
            updateData.dateOfBirth = new Date(data.dateOfBirth);
        }

        if (data.gender) {
            updateData.gender = data.gender;
        }

        if (data.pin) {
            updateData.pin = data.pin;
        }

        if (Object.keys(updateData).length === 0) {
            return await UserModel.findById(userId);
        }

        return await UserModel.findByIdAndUpdate(
            userId,
            {
                $set: updateData,
            },
            {
                new: true,
                runValidators: true,
            }
        );
    }
}
