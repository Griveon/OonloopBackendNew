import type { Request, Response } from "express";
import { ResponseUtil } from "../../../utils/response.util.js";
import { DriverWalletService } from "../services/driverwallet.service.js";

export class DriverWalletController {

    private service =
        new DriverWalletService();

    createWallet = async (
        req: Request,
        res: Response
    ) => {
        try {

            const wallet =
                await this.service.createWallet(
                    req.body.driverId
                );

            return res.status(201).json(
                ResponseUtil.created(
                    "Wallet created successfully",
                    wallet
                )
            );

        } catch (error: any) {

            return res.status(400).json(
                ResponseUtil.badRequest(
                    error.message
                )
            );
        }
    };

    getWallet = async (
        req: Request,
        res: Response
    ) => {
        try {

            const wallet =
                await this.service.getWallet(
                    req.params.driverId
                );

            return res.status(200).json(
                ResponseUtil.success(
                    "Wallet fetched successfully",
                    wallet
                )
            );

        } catch (error: any) {

            return res.status(404).json(
                ResponseUtil.notFound(
                    error.message
                )
            );
        }
    };
}