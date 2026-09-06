import type { Request, Response } from "express";
import { UserPreferenceService } from "../services/userpreference.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class UserPreferenceController {
    private service: UserPreferenceService;

    constructor() {
        this.service = new UserPreferenceService();
    }

    // 📌 Get
    getPreferences = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            const data = await this.service.getPreferences(userId!);

            return res.status(200).json(
                ResponseUtil.success("Preferences fetched successfully", data)
            );
        } catch (err: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(err.message)
            );
        }
    };

    // ✏️ Set SINGLE (FIXED)
    setPreference = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const { key, value } = req.body;

            const data = await this.service.setPreference(userId!, key, value);

            return res.status(200).json(
                ResponseUtil.success("Preference updated", data)
            );
        } catch (err: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(err.message)
            );
        }
    };

    // ✏️ Set MULTIPLE
    setPreferences = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            const data = await this.service.setPreferences(userId!, req.body);

            return res.status(200).json(
                ResponseUtil.success("Preferences updated", data)
            );
        } catch (err: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(err.message)
            );
        }
    };

    // 🔄 Reset
    resetPreferences = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;

            const data = await this.service.resetPreferences(userId!);

            return res.status(200).json(
                ResponseUtil.success("Preferences reset", data)
            );
        } catch (err: any) {
            return res.status(400).json(
                ResponseUtil.badRequest(err.message)
            );
        }
    };
}