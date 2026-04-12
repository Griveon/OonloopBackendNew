import type { Request, Response } from "express";
import { UserProfileService } from "../services/userprofile.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class UserProfileController {
    private service: UserProfileService;

    constructor() {
        this.service = new UserProfileService();
    }

    private getParam(param: string | string[] | undefined): string | null {
        const id = Array.isArray(param) ? param[0] : param;
        return id || null;
    }

    createProfile = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;

            const profile = await this.service.create(userId);

            return res.status(201).json(
                ResponseUtil.created("Profile created successfully", profile)
            );
        } catch (error: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(error.message)
            );
        }
    };

    getProfile = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;

            const profile = await this.service.getProfile(userId);

            return res.status(200).json(
                ResponseUtil.success("Profile fetched successfully", profile)
            );
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    updateProfile = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;

            const updated = await this.service.update(userId, req.body);

            return res.status(200).json(
                ResponseUtil.success("Profile updated successfully", updated)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    addAddress = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;

            const profile = await this.service.addAddress(userId, req.body);

            return res.status(200).json(
                ResponseUtil.success("Address added successfully", profile?.addresses)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };

    updateAddress = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;
            const addressId = this.getParam(req.params.addressId);

            if (!addressId) {
                return res
                    .status(400)
                    .json(ResponseUtil.badRequest("Address ID required"));
            }

            const profile = await this.service.updateAddress(
                userId,
                addressId,
                req.body
            );

            return res.status(200).json(
                ResponseUtil.success(
                    "Address updated successfully",
                    profile?.addresses
                )
            );
        } catch (error: any) {
            return res
                .status(400)
                .json(ResponseUtil.badRequest(error.message));
        }
    };

    deleteAddress = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;
            const addressId = this.getParam(req.params.addressId);

            if (!addressId) {
                return res.status(400).json(ResponseUtil.badRequest("Address ID required"));
            }

            const profile = await this.service.deleteAddress(userId, addressId);

            return res.status(200).json(
                ResponseUtil.success("Address deleted successfully", profile?.addresses)
            );
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message));
        }
    };

    setDefaultAddress = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;
            const addressId = this.getParam(req.params.addressId);

            if (!addressId) {
                return res.status(400).json(ResponseUtil.badRequest("Address ID required"));
            }

            const profile = await this.service.setDefaultAddress(userId, addressId);

            return res.status(200).json(
                ResponseUtil.success("Default address updated", profile?.addresses)
            );
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message));
        }
    };
}