import { Router } from "express";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../validations/workspace.validation.js";
import { authMiddleware } from "../../../middlewares/authmiddleware/auth.middleware.js";
import { validateUsingZOD } from "../../../utils/zodvalidate.util.js";
import { WorkspaceController } from "../controllers/workspace.controller.js";

const workspaceRoutes = Router();
const controller = new WorkspaceController();

// Create a new workspace
workspaceRoutes.post(
    "/create",
    authMiddleware,
    validateUsingZOD(createWorkspaceSchema),
    controller.createWorkspace
);

// Get workspace by ID
workspaceRoutes.get(
    "/get/:id",
    authMiddleware,
    controller.getWorkspaceById
);

// Get all workspaces (pagination + search)
workspaceRoutes.get(
    "/getall",
    authMiddleware,
    controller.getAllWorkspaces
);

// Update workspace
workspaceRoutes.put(
    "/update/:id",
    authMiddleware,
    validateUsingZOD(updateWorkspaceSchema),
    controller.updateWorkspace
);

// Delete workspace
workspaceRoutes.delete(
    "/delete/:id",
    authMiddleware,
    controller.deleteWorkspace
);

// Deactivate workspace
workspaceRoutes.put(
    "/deactivate/:id",
    authMiddleware,
    controller.deactivateWorkspace
);

// Activate workspace
workspaceRoutes.put(
    "/activate/:id",
    authMiddleware,
    controller.activateWorkspace
);

export default workspaceRoutes;