import type { Request, Response } from "express";
import { WorkspaceSubscriptionService } from "../services/workspacesubscription.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

const getParam = (param: string | string[] | undefined): string | null => {
    if (!param) return null;

    const value = Array.isArray(param) ? param[0] : param;
    return value ?? null;
};

export class WorkspaceSubscriptionController {
    private subscriptionService: WorkspaceSubscriptionService;

    constructor() {
        this.subscriptionService = new WorkspaceSubscriptionService();
    }

    createSubscription = async (req: Request, res: Response) => {
        try {
            const user = req.user?.id;
            const { workspace, plan } = req.body;

            if (!user) {
                return res.status(401).json(
                    ResponseUtil.unauthorized("Unauthorized")
                );
            }

            if (!workspace || !plan) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Workspace and Plan are required")
                );
            }

            const subscription = await this.subscriptionService.createSubscription(
                user,
                workspace,
                plan
            );

            return res.status(201).json(
                ResponseUtil.created("Subscription created successfully", subscription)
            );
        } catch (error: any) {
            console.error(error);
            return res.status(400).json(
                ResponseUtil.badRequest(error.message || "Bad request")
            );
        }
    };

    // 📌 Get active subscription by workspace
    getActiveSubscription = async (req: Request, res: Response) => {
        try {
            const workspace = getParam(req.params.workspaceId);

            if (!workspace) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Workspace ID is required")
                );
            }

            const subscription =
                await this.subscriptionService.getActiveSubscription(workspace);

            return res.status(200).json(
                ResponseUtil.success(
                    "Active subscription fetched successfully",
                    subscription
                )
            );
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(
                ResponseUtil.notFound(error.message || "Subscription not found")
            );
        }
    };

    // 🔄 Change Plan
    changePlan = async (req: Request, res: Response) => {
        try {
            const workspace = getParam(req.params.workspaceId);
            const { plan } = req.body;

            if (!workspace || !plan) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Workspace ID and Plan are required")
                );
            }

            const subscription =
                await this.subscriptionService.changePlan(workspace, plan);

            return res.status(200).json(
                ResponseUtil.success("Plan updated successfully", subscription)
            );
        } catch (error: any) {
            console.error(error);
            return res.status(400).json(
                ResponseUtil.badRequest(error.message || "Failed to change plan")
            );
        }
    };

    // ❌ Cancel subscription (by workspace)
    cancelSubscription = async (req: Request, res: Response) => {
        try {
            const workspace = getParam(req.params.workspaceId);

            if (!workspace) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Workspace ID is required")
                );
            }

            const subscription =
                await this.subscriptionService.cancelSubscription(workspace);

            return res.status(200).json(
                ResponseUtil.success("Subscription cancelled successfully", subscription)
            );
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(
                ResponseUtil.notFound(error.message || "Subscription not found")
            );
        }
    };

    // 🔁 Activate subscription (by subscription ID)
    activateSubscription = async (req: Request, res: Response) => {
        try {
            const id = getParam(req.params.subscriptionId);

            if (!id) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Subscription ID is required")
                );
            }

            const subscription =
                await this.subscriptionService.activateSubscription(id);

            return res.status(200).json(
                ResponseUtil.success("Subscription activated successfully", subscription)
            );
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(
                ResponseUtil.notFound(error.message || "Subscription not found")
            );
        }
    };

    // 🔍 Get subscription by ID
    getSubscriptionById = async (req: Request, res: Response) => {
        try {
            const id = getParam(req.params.subscriptionId);

            if (!id) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Subscription ID is required")
                );
            }

            const subscription =
                await this.subscriptionService.getSubscriptionById(id);

            return res.status(200).json(
                ResponseUtil.success("Subscription fetched successfully", subscription)
            );
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(
                ResponseUtil.notFound(error.message || "Subscription not found")
            );
        }
    };

    // 📄 Get all subscriptions
    getAllSubscriptions = async (req: Request, res: Response) => {
        try {
            const page = parseInt((req.query.page as string) || "1", 10);
            const limit = parseInt((req.query.limit as string) || "10", 10);
            const search = (req.query.search as string) || "";

            const { subscriptions, total } =
                await this.subscriptionService.getAllSubscriptions({
                    page,
                    limit,
                    search,
                });

            return res.status(200).json(
                ResponseUtil.paginated(
                    "Subscriptions fetched successfully",
                    subscriptions,
                    page,
                    limit,
                    total
                )
            );
        } catch (error: any) {
            console.error(error);
            return res.status(500).json(
                ResponseUtil.serverError(
                    error.message || "Internal server error",
                    error
                )
            );
        }
    };

    // 🗑 Delete subscription
    deleteSubscription = async (req: Request, res: Response) => {
        try {
            const id = getParam(req.params.subscriptionId);

            if (!id) {
                return res.status(400).json(
                    ResponseUtil.badRequest("Subscription ID is required")
                );
            }

            await this.subscriptionService.deleteSubscription(id);

            return res.status(200).json(
                ResponseUtil.success("Subscription deleted successfully", {})
            );
        } catch (error: any) {
            console.error(error);
            return res.status(404).json(
                ResponseUtil.notFound(error.message || "Subscription not found")
            );
        }
    };
}