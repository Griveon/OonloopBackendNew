import type { Request, Response } from "express";
import { WorkspaceService } from "../services/workspace.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class WorkspaceController {
    private workspaceService: WorkspaceService;

    constructor() {
        this.workspaceService = new WorkspaceService();
    }

    // Create a new workspace
    createWorkspace = async (req: Request, res: Response) => {
        try {
            const workspace = await this.workspaceService.createWorkspace(req.body);
            return res
                .status(201)
                .json(ResponseUtil.created("Workspace created successfully", workspace));
        } catch (error: any) {
            console.error(error);
            return res
                .status(400)
                .json(
                    ResponseUtil.badRequest(typeof error.message === "string" ? error.message : "Bad request")
                );
        }
    };

    // Get all workspaces with pagination & search
    getAllWorkspaces = async (req: Request, res: Response) => {
        try {
            const page = parseInt((req.query.page as string) || "1", 10);
            const limit = parseInt((req.query.limit as string) || "10", 10);
            const search = (req.query.search as string) || "";

            const { workspaces, total } = await this.workspaceService.getAllWorkspaces({ page, limit, search });

            return res
                .status(200)
                .json(ResponseUtil.paginated("Workspaces fetched successfully", workspaces, page, limit, total));
        } catch (error: any) {
            console.error(error);
            return res
                .status(500)
                .json(
                    ResponseUtil.serverError(typeof error.message === "string" ? error.message : "Internal server error", error)
                );
        }
    };

    // Get workspace by ID
    getWorkspaceById = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Workspace ID is required"));

            const workspace = await this.workspaceService.getWorkspaceById(id);
            return res.status(200).json(ResponseUtil.success("Workspace fetched successfully", workspace));
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(ResponseUtil.notFound(error.message || "Workspace not found"));
        }
    };

    // Update workspace
    updateWorkspace = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Workspace ID is required"));

            const updatedWorkspace = await this.workspaceService.updateWorkspace(id, req.body);
            return res.status(200).json(ResponseUtil.success("Workspace updated successfully", updatedWorkspace));
        } catch (error: any) {
            console.error(error);
            return res.status(400).json(ResponseUtil.badRequest(error.message || "Bad request"));
        }
    };

    // Delete workspace
    deleteWorkspace = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Workspace ID is required"));

            await this.workspaceService.deleteWorkspace(id);
            return res.status(200).json(ResponseUtil.success("Workspace deleted successfully", {}));
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(ResponseUtil.notFound(error.message || "Workspace not found"));
        }
    };

    // Deactivate workspace
    deactivateWorkspace = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Workspace ID is required"));

            const workspace = await this.workspaceService.deactivateWorkspace(id);
            return res.status(200).json(ResponseUtil.success("Workspace deactivated successfully", workspace));
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(ResponseUtil.notFound(error.message || "Workspace not found"));
        }
    };

    // Activate workspace
    activateWorkspace = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Workspace ID is required"));

            const workspace = await this.workspaceService.activateWorkspace(id);
            return res.status(200).json(ResponseUtil.success("Workspace activated successfully", workspace));
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(ResponseUtil.notFound(error.message || "Workspace not found"));
        }
    };
}