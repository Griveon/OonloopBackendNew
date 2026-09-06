import dotenv from "dotenv";
import { sendWhatsAppTemplate } from "../../../utils/sendWhatsappTemplate.utill.js";

dotenv.config();

export type OrderWhatsAppEvent =
    | "SELLER_ACCEPTED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED";


export interface SendOrderWhatsAppParams {
    event:
    OrderWhatsAppEvent;

    mobile:
    string;

    customerName?:
    string;

    orderNumber:
    string;
}


interface OrderWhatsAppTemplateConfig {
    templateName:
    string | undefined;

    namespace:
    string | null;
}


const TEMPLATE_MAP:
    Record<
        OrderWhatsAppEvent,
        OrderWhatsAppTemplateConfig
    > = {

    SELLER_ACCEPTED: {
        templateName:
            process.env
                .MSG91_WHATSAPP_TEMPLATE_SELLER_ACCEPTED,

        namespace:
            process.env
                .MSG91_WHATSAPP_NAMESPACE_SELLER_ACCEPTED
            || null,
    },

    OUT_FOR_DELIVERY: {
        templateName:
            process.env
                .MSG91_WHATSAPP_TEMPLATE_OUT_FOR_DELIVERY,

        namespace:
            process.env
                .MSG91_WHATSAPP_NAMESPACE_OUT_FOR_DELIVERY
            || null,
    },

    DELIVERED: {
        templateName:
            process.env
                .MSG91_WHATSAPP_TEMPLATE_DELIVERED,

        namespace:
            process.env
                .MSG91_WHATSAPP_NAMESPACE_DELIVERED
            || null,
    },
};


export class OrderWhatsAppService {

    async send({
        event,
        mobile,
        customerName,
        orderNumber,
    }: SendOrderWhatsAppParams) {
        try {
            const config =
                TEMPLATE_MAP[
                event
                ];

            if (
                !config
                    ?.templateName
            ) {
                console.warn(
                    `WhatsApp template not configured for ${event}`,
                );

                return null;
            }


            const normalizedOrderNumber =
                orderNumber
                    ?.toString()
                    .trim();

            if (
                !normalizedOrderNumber
            ) {
                console.warn(
                    `WhatsApp skipped [${event}]: order number missing`,
                );

                return null;
            }


            const normalizedCustomerName =
                customerName
                    ?.trim()
                || "Customer";


            const crqid = [
                "ORDER",
                event,
                normalizedOrderNumber
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        "_",
                    ),
                Date.now(),
            ].join(
                "_",
            );


            const response =
                await sendWhatsAppTemplate({
                    mobile,

                    templateName:
                        config.templateName,

                    components: {
                        body_1: {
                            type:
                                "text",

                            value:
                                normalizedCustomerName,
                        },

                        body_2: {
                            type:
                                "text",

                            value:
                                normalizedOrderNumber,
                        },
                    },

                    crqid,
                });


            console.log(
                `Customer WhatsApp sent [${event}]`,
                {
                    orderNumber:
                        normalizedOrderNumber,

                    mobile,

                    requestId:
                        response
                            ?.request_id,
                },
            );


            return response;
        } catch (error: any) {
            console.error(
                `Customer WhatsApp failed [${event}]:`,
                error?.response?.data
                || error?.message
                || error,
            );

            /**
             * WhatsApp failure must not
             * fail order processing.
             */
            return null;
        }
    }
}