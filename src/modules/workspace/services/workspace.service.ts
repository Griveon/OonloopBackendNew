import { FeatureAccessUtil } from "../../../utils/featureaccess.util.js";
import { FEATURES } from "../../feature/constants/feature_constants.js";
import type { IWorkspaceDocument } from "../interfaces/workspace.interface.js";
import { WorkspaceModel } from "../models/workspace.model.js";
import { WorkspaceRepository } from "../repositories/workspace.repository.js";
import { generateWorkspaceKey } from "../utils/workspace.util.js";

export class WorkspaceService {
    private workspaceRepo: WorkspaceRepository;
    private featureUtil: FeatureAccessUtil;

    constructor() {
        this.workspaceRepo = new WorkspaceRepository();
        this.featureUtil = new FeatureAccessUtil();
    }

    async createWorkspace(data: Omit<IWorkspaceDocument, "key"> & { key?: string }) {
        const userId = data.owner.toString();

        const featureValue = await this.featureUtil.getFeatureValue(
            userId,
            FEATURES.MAX_WORKSPACES
        );
        
        if (typeof featureValue !== "number") {
            throw new Error("Invalid feature type for MAX_WORKSPACES");
        }

        const maxWorkspaces = featureValue;

        const currentCount = await WorkspaceModel.countDocuments({
            owner: userId,
            isActive: true,
        });

        if (currentCount >= maxWorkspaces) {
            throw new Error(`Workspace limit exceeded. Max allowed: ${maxWorkspaces}`);
        }

        const key = data.key || generateWorkspaceKey(data.name);

        const existing = await this.workspaceRepo.findByKey(key);
        if (existing) throw new Error("Workspace key already exists");

        const workspaceData = { ...data, key };
        return await this.workspaceRepo.create(workspaceData);
    }


    async updateWorkspace(id: string, data: Partial<IWorkspaceDocument>) {
        const workspace = await this.workspaceRepo.findById(id);
        if (!workspace) throw new Error("Workspace not found");

        return await this.workspaceRepo.update(id, data);
    }

    async getAllWorkspaces(options: { page?: number; limit?: number; search?: string } = {}) {
        const { page = 1, limit = 10, search = "" } = options;
        return await this.workspaceRepo.findAll(page, limit, search);
    }

    async getWorkspaceById(id: string) {
        const workspace = await this.workspaceRepo.findById(id);
        if (!workspace) throw new Error("Workspace not found");
        return workspace;
    }

    async deleteWorkspace(id: string) {
        const workspace = await this.workspaceRepo.findById(id);
        if (!workspace) throw new Error("Workspace not found");
        return await this.workspaceRepo.delete(id);
    }

    async deactivateWorkspace(id: string) {
        const workspace = await this.workspaceRepo.findById(id);
        if (!workspace) throw new Error("Workspace not found");
        return await this.workspaceRepo.deactivate(id);
    }

    async activateWorkspace(id: string) {
        const workspace = await this.workspaceRepo.findById(id);
        if (!workspace) throw new Error("Workspace not found");
        return await this.workspaceRepo.activate(id);
    }
}