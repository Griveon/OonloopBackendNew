import type { Request, Response } from "express";
import { CurrencyService } from "../services/currency.service.js";
import { ResponseUtil } from "../../../utils/response.util.js";

export class CurrencyController {
    private currencyService: CurrencyService;

    constructor() {
        this.currencyService = new CurrencyService();
    }

    createCurrency = async (req: Request, res: Response) => {
        try {
            const currency = await this.currencyService.createCurrency(req.body);
            return res.status(201).json(ResponseUtil.created("Currency created successfully", currency));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message || "Bad request"));
        }
    };

    getAllCurrencies = async (_req: Request, res: Response) => {
        try {
            const currencies = await this.currencyService.getAllCurrencies();
            return res.status(200).json(ResponseUtil.success("Currencies fetched successfully", currencies));
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message || "Internal server error", error));
        }
    };

    getAllCurrenciesWithQuery = async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || ""; // optional search query

            const { currencies, total } = await this.currencyService.getAllCurrenciesWithQuery(page, limit, search);

            return res.status(200).json(
                ResponseUtil.paginated("Currencies fetched successfully", currencies, page, limit, total)
            );
        } catch (error: any) {
            return res.status(500).json(ResponseUtil.serverError(error.message || "Internal server error", error));
        }
    };

    getCurrencyById = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Currency ID is required"));

            const currency = await this.currencyService.getCurrencyById(id);
            return res.status(200).json(ResponseUtil.success("Currency fetched successfully", currency));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message || "Currency not found"));
        }
    };

    updateCurrency = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Currency ID is required"));

            const updated = await this.currencyService.updateCurrency(id, req.body);
            return res.status(200).json(ResponseUtil.success("Currency updated successfully", updated));
        } catch (error: any) {
            return res.status(400).json(ResponseUtil.badRequest(error.message || "Bad request"));
        }
    };

    deactivateCurrency = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Currency ID is required"));

            const currency = await this.currencyService.deactivateCurrency(id);
            return res.status(200).json(ResponseUtil.success("Currency deactivated successfully", currency));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message || "Currency not found"));
        }
    };

    activateCurrency = async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id) return res.status(400).json(ResponseUtil.badRequest("Currency ID is required"));

            const currency = await this.currencyService.activateCurrency(id);
            return res.status(200).json(ResponseUtil.success("Currency activated successfully", currency));
        } catch (error: any) {
            return res.status(404).json(ResponseUtil.notFound(error.message || "Currency not found"));
        }
    };
}