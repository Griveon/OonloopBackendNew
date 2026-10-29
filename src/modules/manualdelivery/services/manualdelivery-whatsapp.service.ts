import { sendWhatsAppTemplate } from "../../../utils/sendWhatsappTemplate.utill.js";
import type { IManualDelivery } from "../interfaces/manualdelivery.interface.js";

export class ManualDeliveryWhatsAppService {
    async sendCreated(delivery: IManualDelivery) {
        const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_MANUAL_ORDER_CREATED;
        const namespace = process.env.MSG91_WHATSAPP_NAMESPACE_MANUAL_ORDER_CREATED;

        if (!templateName || !namespace) {
            console.warn("Manual order WhatsApp skipped: template or namespace not configured.");
            return null;
        }

        try {
            const mobile = delivery.customer.mobileNumber.replace(/\D/g, "");
            const countryCode = (delivery.customer.countryCode || "+91").replace(/\D/g, "");
            // The manual order form accepts local numbers and full international numbers.
            const recipient = mobile.length === 10 ? `${countryCode}${mobile}` : mobile;

            return await sendWhatsAppTemplate({
                mobile: recipient,
                templateName,
                namespace,
                components: {
                    body_1: { type: "text", value: delivery.customer.name.trim() || "Customer" },
                    body_2: { type: "text", value: delivery.deliveryNumber },
                    body_3: { type: "text", value: delivery.pickup.storeName?.trim() || "Store" },
                },
            });
        } catch (error: unknown) {
            // The order is already saved. Notification errors must not cause creation retries.
            console.error("Manual order WhatsApp failed:", {
                deliveryNumber: delivery.deliveryNumber,
                message: error instanceof Error ? error.message : "Unknown messaging error",
            });
            return null;
        }
    }
}
