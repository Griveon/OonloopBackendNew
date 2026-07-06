// src/modules/order/services/customerorders.service.ts

import { CustomerOrderRepository } from "../repository/customerorders.repository.js";

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export class CustomerOrderService {
    private repo = new CustomerOrderRepository();

    async getCustomerDeliveryOtp(
        orderId: any,
        userId: string
    ) {
        if (!orderId) {
            throw new Error("orderId is required");
        }

        if (!userId) {
            throw new Error("userId is required");
        }

        let order: any = await this.repo.findCustomerOrderWithDeliveryOtp(
            orderId,
            userId
        );

        if (!order) {
            throw new Error("Customer order not found");
        }

        /**
         * Customer should see OTP only when driver is near customer
         * or delivery verification is pending.
         */
        const allowedDeliveryStatuses = [
            "out_for_delivery",
            "reached_customer",
            "customer_verification_pending",
            "delivered",
        ];

        const canShowOtp = allowedDeliveryStatuses.includes(
            order.deliveryStatus
        );

        if (!canShowOtp) {
            throw new Error(
                "Delivery OTP is available after driver reaches customer"
            );
        }

        let deliveryOtp = order.customerVerification?.deliveryOtp;

        /**
         * Safety:
         * Old orders may not have delivery OTP generated.
         * Generate it here if missing.
         */
        if (!deliveryOtp) {
            deliveryOtp = generateOtp();

            order = await this.repo.updateCustomerDeliveryOtp(
                order._id,
                deliveryOtp
            );
        }

        return {
            orderId: order._id,
            parentOrder: order.parentOrder,
            orderNumber: order.orderNumber,
            vendorOrderNumber: order.vendorOrderNumber,

            status: order.status,
            sellerStatus: order.sellerStatus,
            deliveryStatus: order.deliveryStatus,

            vendor: order.vendor,
            driver: order.driver,
            items: order.items,

            customerVerification: {
                deliveryOtp,
                otpVerified: order.customerVerification?.otpVerified || false,
                signatureTaken:
                    order.customerVerification?.signatureTaken || false,
                signatureUrl:
                    order.customerVerification?.signatureUrl || null,
                verifiedAt:
                    order.customerVerification?.verifiedAt || null,
                verifiedBy:
                    order.customerVerification?.verifiedBy || null,
            },
        };
    }
}