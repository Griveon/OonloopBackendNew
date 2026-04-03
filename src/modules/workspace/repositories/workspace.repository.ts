import type { IWorkspaceDocument } from "../interfaces/workspace.interface.js";
import { WorkspaceModel } from "../models/workspace.model.js";

export class WorkspaceRepository {

    // Create a new workspace
    async create(data: Partial<IWorkspaceDocument>) {
        return await WorkspaceModel.create(data);
    }

    // Find workspace by key
    async findByKey(key: string) {
        return await WorkspaceModel.findOne({ key }).populate("owner");
    }

    // Find workspace by ID
    async findById(id: string) {
        return await WorkspaceModel.findById(id).populate("owner");
    }

    // Get all workspaces with pagination and optional search by name or key
    async findAll(
        page = 1,
        limit = 10,
        search = ""
    ) {
        const filter: any = {};

        if (search) {
            filter.$or = [
                { key: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const [workspaces, total] = await Promise.all([
            WorkspaceModel.find(filter)
                .populate("owner")
                .skip(skip)
                .limit(limit),
            WorkspaceModel.countDocuments(filter),
        ]);

        return { workspaces, total };
    }

    // Update workspace by ID
    async update(id: string, data: Partial<IWorkspaceDocument>) {
        return await WorkspaceModel.findByIdAndUpdate(id, data, { new: true }).populate("owner");
    }

    // Delete workspace by ID
    async delete(id: string) {
        return await WorkspaceModel.findByIdAndDelete(id);
    }

    // Deactivate workspace
    async deactivate(id: string) {
        return await WorkspaceModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        ).populate("owner");
    }

    // Activate workspace
    async activate(id: string) {
        return await WorkspaceModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        ).populate("owner");
    }
}