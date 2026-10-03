import { PRODUCT_PRICING_CONFIG } from "../constants/productpricing.constant.js";

export interface IProductHandlingCalculation {
    productHandling: number;
    productHandlingCharges: number;
    customerSellingPrice: number;
    finalSellingPrice: number;
    chargeAddedToPrice: number;
    sellerAdjustment: number;
    breakdown: {
        totalPercent: number;
        razorpayPercent: number;
        tdsPercent: number;
        otherChargesPercent: number;
        handlingPercent: number;
    };
}

export function roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateProductHandling(
    sellingPriceInput: number | string,
    mrpInput: number | string
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
    const totalChargeRaw = sellingPrice * (applicablePercent / 100);
    const totalCharge = roundToTwoDecimals(totalChargeRaw);

    const targetPrice = roundToTwoDecimals(sellingPrice + totalCharge);
    const finalSellingPrice = roundToTwoDecimals(Math.min(targetPrice, mrp));

    const availableMargin = roundToTwoDecimals(Math.max(mrp - sellingPrice, 0));
    const chargeAddedToPrice = roundToTwoDecimals(Math.min(totalCharge, availableMargin));
    const sellerAdjustment = roundToTwoDecimals(totalCharge - chargeAddedToPrice);

    return {
        productHandling: totalCharge,
        productHandlingCharges: totalCharge,
        customerSellingPrice: finalSellingPrice,
        finalSellingPrice,
        chargeAddedToPrice,
        sellerAdjustment,
        breakdown: {
            totalPercent: applicablePercent,
            razorpayPercent: PRODUCT_PRICING_CONFIG.RAZORPAY_PERCENT,
            tdsPercent: PRODUCT_PRICING_CONFIG.TDS_PERCENT,
            otherChargesPercent: PRODUCT_PRICING_CONFIG.OTHER_CHARGES_PERCENT,
            handlingPercent: PRODUCT_PRICING_CONFIG.HANDLING_PERCENT,
        },
    };
}
