import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

import type { IUser } from "../interfaces/user.interface.js";
import { UserRepository } from "../repositories/user.repository.js";
import { sendWhatsAppOtp } from "../../../utils/sendWhatsAppOtp.util.js";

type UserRole = "admin" | "user" | "vendor" | "driver";

const ALLOWED_ROLES: UserRole[] = [
    "admin",
    "user",
    "vendor",
    "driver",
];

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    /**
     * Return all valid roles assigned to the user.
     * Supports old users that only contain the role field.
     */
    private getUserRoles(user: any): UserRole[] {
        console.log("user");
        console.log(user);

        const roles =
            Array.isArray(user?.roles) && user.roles.length > 0
                ? user.roles
                : [user?.role];

        return [...new Set(roles)]
            .map((role) => role?.toString().trim().toLowerCase())
            .filter(
                (role): role is UserRole =>
                    ALLOWED_ROLES.includes(role as UserRole)
            );
    }

    /**
     * Validate that the requested login role belongs to the user.
     */
    private validateRequestedRole(
        user: any,
        requestedRole?: string
    ): UserRole {
        if (!requestedRole) {
            throw new Error("Role is required");
        }

        const normalizedRole = requestedRole
            .toString()
            .trim()
            .toLowerCase() as UserRole;

        if (!ALLOWED_ROLES.includes(normalizedRole)) {
            throw new Error("Invalid role value");
        }

        console.log(normalizedRole)
        const userRoles = this.getUserRoles(user);
        console.log(userRoles)

        if (!userRoles.includes(normalizedRole)) {
            throw new Error(
                `You are not registered as ${normalizedRole}. Please check your role and try again.`
            );
        }

        return normalizedRole;
    }

    /**
     * Generate JWT token.
     *
     * Uses JWT_EXPIRES_IN from .env.
     * Falls back to 365 days.
     */
    private generateAuthToken(
        user: any,
        activeRole?: UserRole
    ): string {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error("JWT_SECRET is not configured");
        }

        const roles = this.getUserRoles(user);

        const role: UserRole =
            activeRole ||
            (ALLOWED_ROLES.includes(user?.role)
                ? user.role
                : roles[0]) ||
            "user";

        /**
         * Exclude undefined to support:
         * exactOptionalPropertyTypes: true
         */
        const expiresIn = (
            process.env.JWT_EXPIRES_IN?.trim() || "365d"
        ) as Exclude<SignOptions["expiresIn"], undefined>;

        const options: SignOptions = {
            expiresIn,
        };

        return jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                role,
                roles,
            },
            secret,
            options
        );
    }

    async createUser(data: any) {


        const role = (
            data.role?.toString().trim().toLowerCase() || "user"
        ) as UserRole;

        if (!ALLOWED_ROLES.includes(role)) {
            throw new Error("Invalid role value");
        }

        if (data?.role != "user") {
            if (!data.email) {
                throw new Error("Email is required");
            }

            data.email = data.email
                .toString()
                .toLowerCase()
                .trim();

            if (
                !data.firstName ||
                data.firstName.toString().trim().length < 2
            ) {
                throw new Error(
                    "First name must be at least 2 characters"
                );
            }

            if (
                data.gender &&
                !["male", "female", "other"].includes(
                    data.gender.toString().toLowerCase()
                )
            ) {
                throw new Error("Invalid gender value");
            }

            if (
                data.dateOfBirth &&
                isNaN(new Date(data.dateOfBirth).getTime())
            ) {
                throw new Error("Invalid date of birth");
            }
            if (
                !data.password ||
                data.password.toString().length < 6
            ) {
                throw new Error(
                    "Password must be at least 6 characters"
                );
            }
        }

        if (data.mobileNumber) {
            data.mobileNumber = data.mobileNumber
                .toString()
                .trim();

        }


        if (
            data.mobileNumber &&
            !/^[6-9]\d{9}$/.test(data.mobileNumber)
        ) {
            throw new Error("Invalid mobile number");
        }


        if (
            data.pin &&
            !/^\d{6}$/.test(data.pin.toString())
        ) {
            throw new Error("PIN must be exactly 6 digits");
        }

        if (data.email?.length > 0) {

            const existingEmailUser: any =
                await this.userRepository.findByEmail(
                    data.email
                );

            /**
             * Existing user signing up with a new role.
             */
            if (existingEmailUser) {
                const existingRoles =
                    this.getUserRoles(existingEmailUser);

                if (existingRoles.includes(role)) {
                    throw new Error(
                        `Email already registered as ${role}`
                    );
                }

                if (data.mobileNumber) {
                    if (
                        existingEmailUser.mobileNumber &&
                        existingEmailUser.mobileNumber !==
                        data.mobileNumber
                    ) {
                        throw new Error(
                            "This email is already registered with another mobile number"
                        );
                    }

                    const existingMobileUser: any =
                        await this.userRepository.findByMobileNumber(
                            data.mobileNumber
                        );

                    if (
                        existingMobileUser &&
                        existingMobileUser._id.toString() !==
                        existingEmailUser._id.toString()
                    ) {
                        throw new Error(
                            "Mobile number already registered with another account"
                        );
                    }
                }

                await this.userRepository.addRoleToUser(
                    existingEmailUser._id.toString(),
                    role
                );

                const updatedUser: any =
                    await this.userRepository.updateUserBasicInfoIfMissing(
                        existingEmailUser._id.toString(),
                        {
                            mobileNumber:
                                !existingEmailUser.mobileNumber
                                    ? data.mobileNumber
                                    : undefined,

                            dateOfBirth:
                                !existingEmailUser.dateOfBirth
                                    ? data.dateOfBirth
                                    : undefined,

                            gender:
                                !existingEmailUser.gender &&
                                    data.gender
                                    ? data.gender
                                        .toString()
                                        .toLowerCase()
                                    : undefined,

                            pin:
                                !existingEmailUser.pin
                                    ? data.pin?.toString()
                                    : undefined,
                        }
                    );

                if (!updatedUser) {
                    throw new Error(
                        "Unable to update user account"
                    );
                }

                const token = this.generateAuthToken(
                    updatedUser,
                    role
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
                    user: {
                        ...safeUser,
                        role,
                        roles: this.getUserRoles(updatedUser),
                    },
                    token,
                };
            }
        }

        /**
         * New user registration.
         */
        if (data.mobileNumber) {
            const existingMobile =
                await this.userRepository.findByMobileNumber(
                    data.mobileNumber
                );

            if (existingMobile) {
                throw new Error(
                    "Mobile number already registered"
                );
            }
        }

        const user: any =
            await this.userRepository.createUser({
                ...data,

                firstName: data?.firstName?.toString()?.trim() ?? "",

                lastName:
                    data?.lastName
                        ?.toString()?.trim() || "",

                email: data?.email ?? undefined,

                mobileNumber:
                    data?.mobileNumber || undefined,

                gender: data?.gender
                    ? data?.gender
                        .toString()
                        .toLowerCase()
                    : undefined,

                pin: data?.pin
                    ? data?.pin?.toString()
                    : undefined,

                role,

                roles: [role],

            });
        if (role === "user") {
            user.password = null;
        } else {
            user.password = await bcrypt.hash(data.password, 10);
        }

        const token = this.generateAuthToken(
            user,
            role
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
            user: {
                ...safeUser,
                role,
                roles: this.getUserRoles(user),
            },
            token,
        };
    }

    async getUserById(userId: string) {
        const user =
            await this.userRepository.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    }

    async updatePassword(
        userId: string,
        password: string
    ) {
        if (!password || password.length < 6) {
            throw new Error(
                "Password must be at least 6 characters"
            );
        }

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        return await this.userRepository.updatePassword(
            userId,
            hashedPassword
        );
    }

    async updateLastLogin(userId: string) {
        return await this.userRepository.updateLastLogin(
            userId
        );
    }

    private async validateDriverProfileIfNeeded(
        user: any,
        role?: UserRole
    ) {
        if (role !== "driver") {
            return null;
        }

        const userRoles = this.getUserRoles(user);

        if (!userRoles.includes("driver")) {
            throw new Error(
                "You are not registered as driver. Please check your role and try again."
            );
        }

        const driverProfile =
            await this.userRepository.findDriverProfileByUserId(
                user._id.toString()
            );

        // if (!driverProfile) {
        //     throw new Error(
        //         "Driver profile not found. Please complete driver registration first"
        //     );
        // }

        return driverProfile ?? [];
    }

    async login(
        identifier: string,
        pin: string,
        role?: string
    ) {
        const normalizedIdentifier = identifier
            ?.toString()
            .trim();

        const normalizedPin = pin
            ?.toString()
            .trim();

        if (!normalizedIdentifier) {
            throw new Error("Identifier is required");
        }

        if (!normalizedPin) {
            throw new Error("PIN is required");
        }

        let user: any;

        const isEmail =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                normalizedIdentifier
            );

        if (isEmail) {
            user =
                await this.userRepository.findByEmail(
                    normalizedIdentifier.toLowerCase()
                );
        } else {
            user =
                await this.userRepository.findByMobileNumber(
                    normalizedIdentifier
                );
        }

        if (!user) {
            throw new Error("User does not exist");
        }

        if (user.status !== "active") {
            throw new Error(
                user.status === "suspended"
                    ? "Your account is suspended"
                    : "Your account is inactive"
            );
        }

        if (
            !user.pin ||
            user.pin.toString() !== normalizedPin
        ) {
            throw new Error("Invalid credentials");
        }

        const activeRole =
            this.validateRequestedRole(user, role);

        const driverProfile =
            await this.validateDriverProfileIfNeeded(
                user,
                activeRole
            );

        await this.userRepository.updateLastLogin(
            user._id.toString()
        );

        const token = this.generateAuthToken(
            user,
            activeRole
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
                role: activeRole,
                roles: this.getUserRoles(user),
            },
            driverProfile,
            token,
        };
    }

    async updateProfile(
        userId: string,
        data: Partial<IUser>
    ) {
        const user =
            await this.userRepository.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        if (data.email) {
            const email = data.email
                .toLowerCase()
                .trim();

            if (email !== user.email) {
                const existing =
                    await this.userRepository.findByEmail(
                        email
                    );

                if (
                    existing &&
                    existing._id.toString() !== userId
                ) {
                    throw new Error(
                        "Email already in use"
                    );
                }
            }

            data.email = email;
        }

        if (data.mobileNumber) {
            const normalizedMobile =
                data.mobileNumber.trim();

            if (
                normalizedMobile !== user.mobileNumber
            ) {
                const existingMobile =
                    await this.userRepository.findByMobileNumber(
                        normalizedMobile
                    );

                if (
                    existingMobile &&
                    existingMobile._id.toString() !==
                    userId
                ) {
                    throw new Error(
                        "Mobile number already in use"
                    );
                }
            }

            data.mobileNumber = normalizedMobile;
        }

        if (
            data.firstName &&
            data.firstName.trim().length < 2
        ) {
            throw new Error(
                "First name must be at least 2 characters"
            );
        }

        if (
            data.gender &&
            !["male", "female", "other"].includes(
                data.gender
            )
        ) {
            throw new Error("Invalid gender");
        }

        if (
            data.dateOfBirth &&
            isNaN(new Date(data.dateOfBirth).getTime())
        ) {
            throw new Error("Invalid date of birth");
        }

        delete data.password;
        delete data.role;
        delete data.roles;
        delete data.resetPasswordToken;
        delete data.resetPasswordExpire;

        return await this.userRepository.updateProfile(
            userId,
            data
        );
    }

    private generateOTP(): string {
        return Math.floor(
            100000 + Math.random() * 900000
        ).toString();
    }

    async sendOtp(mobile: string) {
        const normalizedMobile = mobile
            ?.toString()
            .trim();

        if (!normalizedMobile) {
            throw new Error(
                "Mobile number is required"
            );
        }

        const user =
            await this.userRepository.findByMobileNumber(
                normalizedMobile
            );

        if (!user) {
            throw new Error("User not found");
        }

        if (user.status !== "active") {
            throw new Error(
                user.status === "suspended"
                    ? "Your account is suspended"
                    : "Your account is inactive"
            );
        }

        const otp = this.generateOTP();

        await this.userRepository.updateOtp(
            user._id.toString(),
            otp,
            Date.now() + 5 * 60 * 1000
        );

        await sendWhatsAppOtp({
            mobile: normalizedMobile,
            otp,
        });

        return {
            message: "OTP sent successfully",
        };
    }

    async verifyOtp(
        mobile: string,
        otp: string,
        role?: string
    ) {
        const normalizedMobile = mobile
            ?.toString()
            .trim();

        const normalizedOtp = otp
            ?.toString()
            .trim();

        if (!normalizedMobile) {
            throw new Error(
                "Mobile number is required"
            );
        }

        if (!normalizedOtp) {
            throw new Error("OTP is required");
        }

        const user: any =
            await this.userRepository.findByMobileNumber(
                normalizedMobile
            );

        if (!user) {
            throw new Error("User not found");
        }

        if (user.status !== "active") {
            throw new Error(
                user.status === "suspended"
                    ? "Your account is suspended"
                    : "Your account is inactive"
            );
        }

        const activeRole =
            this.validateRequestedRole(user, role);

        if (!user.otp || !user.otpExpiry) {
            throw new Error("OTP not generated");
        }

        if (Date.now() > Number(user.otpExpiry)) {
            await this.userRepository.clearOtp(
                user._id.toString()
            );

            throw new Error("OTP expired");
        }

        if (
            user.otp.toString() !== normalizedOtp
        ) {
            throw new Error("Invalid OTP");
        }

        const driverProfile =
            await this.validateDriverProfileIfNeeded(
                user,
                activeRole
            );

        await this.userRepository.clearOtp(
            user._id.toString()
        );

        await this.userRepository.updateLastLogin(
            user._id.toString()
        );

        const token = this.generateAuthToken(
            user,
            activeRole
        );

        const {
            password,
            otp: _otp,
            otpExpiry,
            resetPasswordToken,
            resetPasswordExpire,
            ...safeUser
        } = user.toObject();

        return {
            user: {
                ...safeUser,
                role: activeRole,
                roles: this.getUserRoles(user),
            },
            driverProfile,
            token,
        };
    }

    async updatePin(
        mobile: string,
        pin: string,
        role?: string
    ) {
        const normalizedMobile = mobile
            ?.toString()
            .trim();

        const normalizedPin = pin
            ?.toString()
            .trim();

        if (!normalizedMobile) {
            throw new Error(
                "Mobile number is required"
            );
        }

        if (
            !normalizedPin ||
            !/^\d{6}$/.test(normalizedPin)
        ) {
            throw new Error(
                "PIN must be exactly 6 digits"
            );
        }

        const user: any =
            await this.userRepository.findByMobileNumber(
                normalizedMobile
            );

        if (!user) {
            throw new Error("User not found");
        }

        if (user.status !== "active") {
            throw new Error(
                user.status === "suspended"
                    ? "Your account is suspended"
                    : "Your account is inactive"
            );
        }

        const activeRole =
            this.validateRequestedRole(user, role);

        const updatedUser: any =
            await this.userRepository.updatePinByMobile(
                normalizedMobile,
                normalizedPin
            );

        if (!updatedUser) {
            throw new Error(
                "Unable to update PIN"
            );
        }

        await this.userRepository.updateLastLogin(
            updatedUser._id.toString()
        );

        const token = this.generateAuthToken(
            updatedUser,
            activeRole
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
            user: {
                ...safeUser,
                role: activeRole,
                roles: this.getUserRoles(updatedUser),
            },
            token,
        };
    }

    async getUserProfile(userId: string) {
        const user =
            await this.userRepository.findById(userId);

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