import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const AUTH_KEY =
    process.env.MSG91_AUTHKEY as string;

const BASE_URL =
    process.env.MSG91_WHATSAPP_BASE_URL as string;

const WHATSAPP_NUMBER =
    process.env.MSG91_WHATSAPP_NUMBER as string;

export interface WhatsAppTemplateComponent {
    type: "text";
    value: string;
}

export interface SendWhatsAppTemplateParams {
    mobile: string;

    templateName: string;

    components?: Record<
        string,
        WhatsAppTemplateComponent
    >;

    crqid?: string;

    languageCode?: string;
}

export const sendWhatsAppTemplate = async ({
    mobile,
    templateName,
    components = {},
    crqid,
    languageCode = "en",
}: SendWhatsAppTemplateParams): Promise<any> => {
    try {
        if (!AUTH_KEY) {
            throw new Error(
                "MSG91_AUTHKEY is not configured.",
            );
        }

        if (!BASE_URL) {
            throw new Error(
                "MSG91_WHATSAPP_BASE_URL is not configured.",
            );
        }

        if (!WHATSAPP_NUMBER) {
            throw new Error(
                "MSG91_WHATSAPP_NUMBER is not configured.",
            );
        }

        const normalizedMobile =
            normalizeMobileNumber(
                mobile,
            );

        if (!normalizedMobile) {
            throw new Error(
                "Mobile number is required.",
            );
        }

        const payload = {
            integrated_number:
                WHATSAPP_NUMBER,

            content_type:
                "template",

            ...(crqid
                ? {
                    CRQID:
                        crqid,
                }
                : {}),

            payload: {
                messaging_product:
                    "whatsapp",

                type:
                    "template",

                template: {
                    name:
                        templateName,

                    language: {
                        code:
                            languageCode,

                        policy:
                            "deterministic",
                    },

                    /**
                     * MSG91 generated cURL
                     * returned namespace: null.
                     *
                     * We can omit namespace
                     * completely.
                     */

                    to_and_components: [
                        {
                            to: [
                                normalizedMobile,
                            ],

                            components,
                        },
                    ],
                },
            },
        };

        const response =
            await axios.post(
                BASE_URL,
                payload,
                {
                    headers: {
                        "Content-Type":
                            "application/json",

                        authkey:
                            AUTH_KEY,
                    },

                    timeout:
                        15000,
                },
            );

        return response.data;
    } catch (error: unknown) {
        if (
            axios.isAxiosError(
                error,
            )
        ) {
            console.error(
                "MSG91 WhatsApp API error:",
                {
                    status:
                        error.response
                            ?.status,

                    data:
                        error.response
                            ?.data,

                    message:
                        error.message,

                    templateName,
                },
            );
        } else {
            console.error(
                "MSG91 WhatsApp error:",
                error,
            );
        }

        throw error;
    }
};

const normalizeMobileNumber = (
    mobile: string,
): string => {
    return mobile
        .trim()
        .replace(
            /^\+/,
            "",
        )
        .replace(
            /\D/g,
            "",
        );
};