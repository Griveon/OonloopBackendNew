
import mongoose from "mongoose";

import { connectDatabase } from "../config/database.js";
import { UserModel } from "../modules/user/models/user.model.js";

const ALLOWED_ROLES = [
    "admin",
    "user",
    "vendor",
    "driver",
] as const;

type UserRole = (typeof ALLOWED_ROLES)[number];

const isValidRole = (role: unknown): role is UserRole => {
    return (
        typeof role === "string" &&
        ALLOWED_ROLES.includes(role as UserRole)
    );
};

const migrateUserRoles = async (): Promise<void> => {
    await connectDatabase();

    const users = await UserModel.find({
        $or: [
            {
                roles: {
                    $exists: false,
                },
            },
            {
                roles: null,
            },
            {
                roles: {
                    $size: 0,
                },
            },
        ],
    })
        .select("_id role roles")
        .lean();

    console.log(`Users found for migration: ${users.length}`);

    if (users.length === 0) {
        console.log("No users require roles migration");
        return;
    }

    const operations = users.map((user) => {
        const role: UserRole = isValidRole(user.role)
            ? user.role
            : "user";

        return {
            updateOne: {
                filter: {
                    _id: user._id,
                },
                update: {
                    $set: {
                        role,
                        roles: [role],
                    },
                },
            },
        };
    });

    const result = await UserModel.bulkWrite(operations);

    console.log("User roles migration completed successfully");
    console.log(`Matched users: ${result.matchedCount}`);
    console.log(`Updated users: ${result.modifiedCount}`);
};

const runMigration = async (): Promise<void> => {
    try {
        await migrateUserRoles();
    } catch (error) {
        console.error("User roles migration failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    }
};

void runMigration();
