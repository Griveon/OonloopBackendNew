import { UserModel } from "../models/user.model.js";
import type { IUser } from "../interfaces/user.interface.js";

export class UserRepository {

    async createUser(data: Partial<IUser>) {
        return await UserModel.create(data);
    }

    async findByEmail(email: string) {
        return await UserModel.findOne({ email });
    }

    async findByMobileNumber(mobileNumber: string) {
        return await UserModel.findOne({ mobileNumber });
    }

    async findById(id: string) {
        return await UserModel.findById(id);
    }

    async updateLastLogin(userId: string) {
        return await UserModel.findByIdAndUpdate(
            userId,
            { lastLogin: new Date() },
            { new: true }
        );
    }

    async updatePassword(userId: string, password: string) {
        return await UserModel.findByIdAndUpdate(
            userId,
            { password },
            { new: true }
        );
    }

    async updateProfile(userId: string, data: Partial<IUser>) {
        return await UserModel.findByIdAndUpdate(
            userId,
            { $set: data },
            { new: true, runValidators: true }
        ).select("-password");
    }

}