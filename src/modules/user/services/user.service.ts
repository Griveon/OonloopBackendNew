import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { IUser } from "../interfaces/user.interface.js";
import { UserRepository } from "../repositories/user.repository.js";
import { sendWhatsAppOtp } from "../../../utils/sendWhatsAppOtp.util.js";

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    async createUser(data: any) {
        data.email = data.email.toLowerCase().trim();

        if (data.mobileNumber) {
            data.mobileNumber = data.mobileNumber.trim();
        }

        const role = data.role || "user";

        if (!["user", "vendor", "driver"].includes(role)) {
            throw new Error("Invalid role value");
        }

        if (!data.firstName || data.firstName.trim().length < 2) {
            throw new Error("First name must be at least 2 characters");
        }

        if (!data.password || data.password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }

        if (!data.email) {
            throw new Error("Email is required");
        }

        if (data.mobileNumber && !/^[6-9]\d{9}$/.test(data.mobileNumber)) {
            throw new Error("Invalid mobile number");
        }

        if (data.gender && !["male", "female", "other"].includes(data.gender)) {
            throw new Error("Invalid gender value");
        }

        if (data.dateOfBirth && isNaN(new Date(data.dateOfBirth).getTime())) {
            throw new Error("Invalid date of birth");
        }

        if (data.pin && !/^\d{6}$/.test(data.pin)) {
            throw new Error("PIN must be exactly 6 digits");
        }

        const existingEmailUser: any = await this.userRepository.findByEmail(data.email);

        /**
         * CASE 1:
         * Same email already exists.
         *
         * If same role already exists => error.
         * If different role => add new role into roles array.
         */
        if (existingEmailUser) {
            const existingRoles =
                Array.isArray(existingEmailUser.roles) && existingEmailUser.roles.length > 0
                    ? existingEmailUser.roles
                    : [existingEmailUser.role];

            if (existingRoles.includes(role)) {
                throw new Error(`Email already registered as ${role}`);
            }

            if (data.mobileNumber) {
                if (
                    existingEmailUser.mobileNumber &&
                    existingEmailUser.mobileNumber !== data.mobileNumber
                ) {
                    throw new Error("This email is already registered with another mobile number");
                }

                const existingMobileUser: any =
                    await this.userRepository.findByMobileNumber(data.mobileNumber);

                if (
                    existingMobileUser &&
                    existingMobileUser._id.toString() !== existingEmailUser._id.toString()
                ) {
                    throw new Error("Mobile number already registered with another account");
                }
            }

            await this.userRepository.addRoleToUser(
                existingEmailUser._id.toString(),
                role as "user" | "vendor" | "driver"
            );

            const updatedUser: any = await this.userRepository.updateUserBasicInfoIfMissing(
                existingEmailUser._id.toString(),
                {
                    mobileNumber: !existingEmailUser.mobileNumber
                        ? data.mobileNumber
                        : undefined,
                    dateOfBirth: !existingEmailUser.dateOfBirth
                        ? data.dateOfBirth
                        : undefined,
                    gender: !existingEmailUser.gender
                        ? data.gender
                        : undefined,
                    pin: !existingEmailUser.pin
                        ? data.pin
                        : undefined,
                }
            );

            const token = jwt.sign(
                {
                    id: updatedUser._id,
                    email: updatedUser.email,
                    role,
                    roles: updatedUser.roles,
                },
                process.env.JWT_SECRET as string,
                {
                    expiresIn: "7d",
                }
            );

            const {
                password,
                otp,
                otpExpiry,
                resetPasswordToken,
                resetPasswordExpire,
                ...safeUser
            } = updatedUser.toObject();

            return {
                message: `${role} role added successfully`,
                user: safeUser,
                token,
            };
        }

        /**
         * CASE 2:
         * New email.
         * Create fresh user.
         */
        if (data.mobileNumber) {
            const existingMobile = await this.userRepository.findByMobileNumber(
                data.mobileNumber
            );

            if (existingMobile) {
                throw new Error("Mobile number already registered");
            }
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await this.userRepository.createUser({
            ...data,
            firstName: data.firstName.trim(),
            lastName: data.lastName?.trim() || "",
            email: data.email,
            mobileNumber: data.mobileNumber,
            gender: data.gender,
            role: role as "user" | "vendor" | "driver",
            roles: [role as "user" | "vendor" | "driver"],
            password: hashedPassword,
        });

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                roles: user.roles,
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d",
            }
        );

        const {
            password,
            otp,
            otpExpiry,
            resetPasswordToken,
            resetPasswordExpire,
            ...safeUser
        } = user.toObject();

        return {
            message: "User registered successfully",
            user: safeUser,
            token,
        };
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

    private async validateDriverProfileIfNeeded(user: any, role?: string) {
        if (role !== "driver") {
            return null;
        }

        const userRoles =
            Array.isArray(user.roles) && user.roles.length > 0
                ? user.roles
                : [user.role];

        if (!userRoles.includes("driver")) {
            throw new Error("You are not registered as driver. Please check your role and try again.");
        }

        const driverProfile = await this.userRepository.findDriverProfileByUserId(
            user._id.toString()
        );

        if (!driverProfile) {
            throw new Error("Driver profile not found. Please complete driver registration first");
        }

        return driverProfile;
    }

    async login(identifier: string, pin: string, role?: string) {
        let user: any;

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        if (isEmail) {
            user = await this.userRepository.findByEmail(identifier.toLowerCase().trim());
        } else {
            user = await this.userRepository.findByMobileNumber(identifier.trim());
        }

        if (!user) {
            throw new Error("User does not exist");
        }

        if (user.pin !== pin) {
            throw new Error("Invalid credentials");
        }

        if (!role) {
            throw new Error("Role is required");
        }

        const driverProfile = await this.validateDriverProfileIfNeeded(user, role);

        await this.userRepository.updateLastLogin(user._id.toString());

        const tokenRole = role === "driver" ? "driver" : role;

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: tokenRole,
                roles: user.roles,
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d",
            }
        );

        const {
            password,
            otp,
            otpExpiry,
            resetPasswordToken,
            resetPasswordExpire,
            ...safeUser
        } = user.toObject();

        return {
            user: {
                ...safeUser,
                role: tokenRole,
            },
            driverProfile,
            token,
        };
    }

    async updateProfile(userId: string, data: Partial<IUser>) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

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

        if (data.mobileNumber) {
            if (data.mobileNumber !== user.mobileNumber) {
                const existingMobile = await this.userRepository.findByMobileNumber(
                    data.mobileNumber
                );

                if (existingMobile) {
                    throw new Error("Mobile number already in use");
                }
            }
        }

        if (data.firstName && data.firstName.trim().length < 2) {
            throw new Error("First name must be at least 2 characters");
        }

        if (data.gender && !["male", "female", "other"].includes(data.gender)) {
            throw new Error("Invalid gender");
        }

        if (data.dateOfBirth && isNaN(new Date(data.dateOfBirth).getTime())) {
            throw new Error("Invalid date of birth");
        }

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
            Date.now() + 5 * 60 * 1000
        );

        await sendWhatsAppOtp({
            mobile,
            otp,
        });

        return {
            message: "OTP sent successfully",
        };
    }

    async verifyOtp(mobile: string, otp: string, role?: string) {
        const user: any = await this.userRepository.findByMobileNumber(mobile);

        if (!user) {
            throw new Error("User not found");
        }

        if (!role) {
            throw new Error("Role is required");
        }

        if (user.role !== role) {
            throw new Error("You are not registered as this role. Please check your role and try again.");
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

        const driverProfile = await this.validateDriverProfileIfNeeded(user, role);

        await this.userRepository.clearOtp(user._id.toString());

        await this.userRepository.updateLastLogin(user._id.toString());

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                roles: user.roles,
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d",
            }
        );

        const {
            password,
            otp: _,
            otpExpiry,
            resetPasswordToken,
            resetPasswordExpire,
            ...safeUser
        } = user.toObject();

        return {
            user: safeUser,
            driverProfile,
            token,
        };
    }

    async updatePin(mobile: string, pin: string, role?: string) {
        if (!mobile) {
            throw new Error("Mobile number is required");
        }

        if (!pin || !/^\d{6}$/.test(pin)) {
            throw new Error("PIN must be exactly 6 digits");
        }

        if (!role) {
            throw new Error("Role is required");
        }

        const user: any = await this.userRepository.findByMobileNumber(mobile.trim());

        if (!user) {
            throw new Error("User not found");
        }

        if (user.role !== role) {
            throw new Error("You are not registered as this role. Please check your role and try again.");
        }

        const updatedUser: any = await this.userRepository.updatePinByMobile(
            mobile.trim(),
            pin
        );

        if (!updatedUser) {
            throw new Error("Unable to update PIN");
        }

        await this.userRepository.updateLastLogin(updatedUser._id.toString());

        const token = jwt.sign(
            {
                id: updatedUser._id,
                email: updatedUser.email,
                role: updatedUser.role,
                roles: updatedUser.roles,
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d",
            }
        );

        const {
            password,
            otp,
            otpExpiry,
            resetPasswordToken,
            resetPasswordExpire,
            ...safeUser
        } = updatedUser.toObject();

        return {
            user: safeUser,
            token,
        };
    }

    async getUserProfile(userId: string) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        const {
            password,
            otp,
            otpExpiry,
            resetPasswordToken,
            resetPasswordExpire,
            ...safeUser
        } = user.toObject();

        return safeUser;
    }
}