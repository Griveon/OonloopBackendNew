import { PRODUCT_PRICING_CONFIG } from "../constants/productpricing.constant.js";

export interface IAdditionalHandlingConfig {
    enabled?: boolean;
    percentage?: number;
    maxAmount?: number;
}

export interface IAdditionalHandlingSnapshot {
    enabled: boolean;
    percentage: number;
    maxAmount: number;
    amount: number;
}

export interface IProductHandlingCalculation {
    productHandling: number;
    productHandlingCharges: number;
    customerSellingPrice: number;
    finalSellingPrice: number;
    chargeAddedToPrice: number;
    sellerAdjustment: number;
    baseHandlingPercentage: number;
    baseHandlingAmount: number;
    categoryHandlingPercentage: number;
    categoryHandlingAmount: number;
    totalHandlingAmount: number;
    additionalHandling: IAdditionalHandlingSnapshot;
    breakdown: {
        totalPercent: number;
        razorpayPercent: number;
        tdsPercent: number;
        otherChargesPercent: number;
        handlingPercent: number;
        categoryHandlingPercent: number;
        categoryHandlingMaxAmount: number;
    };
}

export function roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getDefaultAdditionalHandlingSnapshot(): IAdditionalHandlingSnapshot {
    return {
        enabled: false,
        percentage: 0,
        maxAmount: 0,
        amount: 0,
    };
}

export function calculateProductHandling(
    sellingPriceInput: number | string,
    mrpInput: number | string,
    additionalHandling?: IAdditionalHandlingConfig | null
): IProductHandlingCalculation {
    const sellingPrice = Number(sellingPriceInput);
    const mrp = Number(mrpInput);

    if (isNaN(sellingPrice) || sellingPrice <= 0) {
        throw new Error("Selling price must be a valid number greater than 0");
    }

    if (isNaN(mrp) || mrp <= 0) {
        throw new Error("MRP must be a valid number greater than 0");
    }

    if (sellingPrice > mrp) {
        throw new Error("Selling price cannot exceed MRP");
    }

    const applicablePercent = PRODUCT_PRICING_CONFIG.TOTAL_PERCENT;
    const desiredBaseHandlingAmount = roundToTwoDecimals(sellingPrice * (applicablePercent / 100));

    const categoryHandlingEnabled = additionalHandling?.enabled === true;
    const categoryHandlingPercentage = categoryHandlingEnabled
        ? Math.max(Number(additionalHandling?.percentage ?? 0), 0)
        : 0;
    const categoryHandlingMaxAmount = categoryHandlingEnabled
        ? Math.max(Number(additionalHandling?.maxAmount ?? 0), 0)
        : 0;
    const desiredCategoryHandlingAmount = roundToTwoDecimals(
        categoryHandlingEnabled
            ? Math.min(
                sellingPrice * (categoryHandlingPercentage / 100),
                categoryHandlingMaxAmount
            )
            : 0
    );

    const availableHandlingRoom = roundToTwoDecimals(Math.max(mrp - sellingPrice, 0));
    const baseHandlingAmount = roundToTwoDecimals(
        Math.min(desiredBaseHandlingAmount, availableHandlingRoom)
    );
    const remainingHandlingRoom = roundToTwoDecimals(
        Math.max(availableHandlingRoom - baseHandlingAmount, 0)
    );
    const categoryHandlingAmount = roundToTwoDecimals(
        Math.min(desiredCategoryHandlingAmount, remainingHandlingRoom)
    );
    const additionalHandlingSnapshot: IAdditionalHandlingSnapshot = {
        enabled: categoryHandlingEnabled,
        percentage: categoryHandlingEnabled ? categoryHandlingPercentage : 0,
        maxAmount: categoryHandlingEnabled ? categoryHandlingMaxAmount : 0,
        amount: categoryHandlingAmount,
    };

    const totalCharge = roundToTwoDecimals(baseHandlingAmount + categoryHandlingAmount);
    let finalSellingPrice = roundToTwoDecimals(sellingPrice + totalCharge);

    if (finalSellingPrice > mrp) {
        finalSellingPrice = roundToTwoDecimals(mrp);
    }

    const desiredTotalHandlingAmount = roundToTwoDecimals(
        desiredBaseHandlingAmount + desiredCategoryHandlingAmount
    );
    const chargeAddedToPrice = totalCharge;
    const sellerAdjustment = roundToTwoDecimals(desiredTotalHandlingAmount - totalCharge);

    return {
        productHandling: totalCharge,
        productHandlingCharges: totalCharge,
        customerSellingPrice: finalSellingPrice,
        finalSellingPrice,
        chargeAddedToPrice,
        sellerAdjustment,
        baseHandlingPercentage: applicablePercent,
        baseHandlingAmount,
        categoryHandlingPercentage,
        categoryHandlingAmount,
        totalHandlingAmount: totalCharge,
        additionalHandling: additionalHandlingSnapshot,
        breakdown: {
            totalPercent: applicablePercent,
            razorpayPercent: PRODUCT_PRICING_CONFIG.RAZORPAY_PERCENT,
            tdsPercent: PRODUCT_PRICING_CONFIG.TDS_PERCENT,
            otherChargesPercent: PRODUCT_PRICING_CONFIG.OTHER_CHARGES_PERCENT,
            handlingPercent: PRODUCT_PRICING_CONFIG.HANDLING_PERCENT,
            categoryHandlingPercent: categoryHandlingPercentage,
            categoryHandlingMaxAmount,
        },
    };
}
