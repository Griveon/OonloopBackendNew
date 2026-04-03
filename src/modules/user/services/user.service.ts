import bcrypt from "bcryptjs";
import type { IUser } from "../interfaces/user.interface.js";
import { UserRepository } from "../repositories/user.repository.js";
import jwt from "jsonwebtoken";

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

        if (data.gender && !["male", "female", "other"].includes(data.gender)) {
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

        return user;
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

    async login(email: string, password: string) {

        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new Error("User does not exist");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error("Invalid email or password");
        }

        await this.userRepository.updateLastLogin(user._id.toString());

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        const { password: _, ...safeUser } = user.toObject(); // remove password
        return {
            user: safeUser,
            token
        };
    }
}