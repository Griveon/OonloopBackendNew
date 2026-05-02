import bcrypt from "bcryptjs";
import type { IUser } from "../interfaces/user.interface.js";
import { UserRepository } from "../repositories/user.repository.js";
import jwt from "jsonwebtoken";
import { sendWhatsAppOtp } from "../../../utils/sendWhatsAppOtp.util.js";

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    async createUser(data: IUser) {
        data.email = data.email.toLowerCase().trim();

        if (!data.firstName || data.firstName.trim().length < 2) {
            throw new Error("First name must be at least 2 characters");
        }

        if (!data.password || data.password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }

        if (!data.email) {
            throw new Error("Email is required");
        }

        const existingEmail = await this.userRepository.findByEmail(data.email);
        if (existingEmail) {
            throw new Error("Email already registered");
        }

        if (data.mobileNumber) {
            const existingMobile = await this.userRepository.findByMobileNumber(data.mobileNumber);
            if (existingMobile) {
                throw new Error("Mobile number already registered");
            }
        }

        if (data.gender && !["male", "female", "other"].includes(data.gender.toLowerCase())) {
            throw new Error("Invalid gender value");
        }

        if (data.dateOfBirth && isNaN(new Date(data.dateOfBirth).getTime())) {
            throw new Error("Invalid date of birth");
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await this.userRepository.createUser({
            ...data,
            password: hashedPassword
        });

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        return { user, token };
    }


    async getUserById(userId: string) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    }

    async updatePassword(userId: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, 10);

        return await this.userRepository.updatePassword(userId, hashedPassword);
    }

    async updateLastLogin(userId: string) {
        return await this.userRepository.updateLastLogin(userId);
    }

    async login(identifier: string, password: string) {

        let user;

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        if (isEmail) {
            user = await this.userRepository.findByEmail(identifier);
        } else {
            user = await this.userRepository.findByMobileNumber(identifier);
        }

        if (!user) {
            throw new Error("User does not exist");
        }

        // const isMatch = await bcrypt.compare(password, user.password);
        // if (!isMatch) {
        //     throw new Error("Invalid credentials");
        // }

        if (user?.pin !== password) {
            throw new Error("Invalid credentials");
        }

        await this.userRepository.updateLastLogin(user._id.toString());

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        const { password: _, ...safeUser } = user.toObject();

        return {
            user: safeUser,
            token
        };
    }
    async updateProfile(userId: string, data: Partial<IUser>) {

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Email update check
        if (data.email) {
            const email = data.email.toLowerCase().trim();

            if (email !== user.email) {
                const existing = await this.userRepository.findByEmail(email);
                if (existing) {
                    throw new Error("Email already in use");
                }
            }

            data.email = email;
        }

        // Mobile number check
        if (data.mobileNumber) {
            if (data.mobileNumber !== user.mobileNumber) {
                const existingMobile = await this.userRepository.findByMobileNumber(data.mobileNumber);
                if (existingMobile) {
                    throw new Error("Mobile number already in use");
                }
            }
        }

        // Validate name
        if (data.firstName && data.firstName.trim().length < 2) {
            throw new Error("First name must be at least 2 characters");
        }

        // Validate gender
        if (data.gender && !["male", "female", "other"].includes(data.gender)) {
            throw new Error("Invalid gender");
        }

        // Validate DOB
        if (data.dateOfBirth && isNaN(new Date(data.dateOfBirth).getTime())) {
            throw new Error("Invalid date of birth");
        }

        // 🚫 Prevent sensitive updates
        delete data.password;
        delete data.role;
        delete data.resetPasswordToken;
        delete data.resetPasswordExpire;

        const updatedUser = await this.userRepository.updateProfile(userId, data);

        return updatedUser;
    }

    private generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOtp(mobile: string) {
        const user = await this.userRepository.findByMobileNumber(mobile);

        if (!user) {
            throw new Error("User not found");
        }

        const otp = this.generateOTP();

        await this.userRepository.updateOtp(
            user._id.toString(),
            otp,
            Date.now() + 5 * 60 * 1000 // 5 minutes
        );

        await sendWhatsAppOtp({
            mobile,
            otp,
        });

        return { message: "OTP sent successfully" };
    }

    async verifyOtp(mobile: string, otp: string) {
        const user: any = await this.userRepository.findByMobileNumber(mobile);

        if (!user) {
            throw new Error("User not found");
        }

        if (!user.otp || !user.otpExpiry) {
            throw new Error("OTP not generated");
        }

        if (Date.now() > user.otpExpiry) {
            throw new Error("OTP expired");
        }

        if (user.otp !== otp) {
            throw new Error("Invalid OTP");
        }

        // ✅ Clear OTP after success
        await this.userRepository.clearOtp(user._id.toString());

        // ✅ Update last login
        await this.userRepository.updateLastLogin(user._id.toString());

        // ✅ Generate JWT
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        const { password, otp: _, otpExpiry, ...safeUser } = user.toObject();

        return {
            user: safeUser,
            token,
        };
    }

    async updatePin(mobile: string, pin: string) {
        if (!mobile) {
            throw new Error("Mobile number is required");
        }

        if (!pin || pin.length !== 6) {
            throw new Error("PIN must be exactly 6 digits");
        }

        const user = await this.userRepository.findByMobileNumber(mobile);

        if (!user) {
            throw new Error("User not found");
        }

        // Optional: hash PIN (recommended for security)
        // const hashedPin = await bcrypt.hash(pin, 10);

        const updatedUser = await this.userRepository.updatePinByMobile(
            mobile,
            pin
        );

        return {
            message: "PIN updated successfully",
            userId: updatedUser?._id,
        };
    }

    async getUserProfile(userId: string) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        // ✅ Remove sensitive fields
        const { password, otp, otpExpiry, resetPasswordToken, resetPasswordExpire, ...safeUser } =
            user.toObject();

        return safeUser;
    }
}