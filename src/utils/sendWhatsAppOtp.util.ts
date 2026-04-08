import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const AUTH_KEY = process.env.MSG91_AUTHKEY as string;
const BASE_URL = process.env.MSG91_WHATSAPP_BASE_URL as string;
const WHATSAPP_NUMBER = process.env.MSG91_WHATSAPP_NUMBER as string;
const TEMPLATE_NAME = process.env.MSG91_WHATSAPP_TEMPLATE_NAME as string;
const TEMPLATE_NAMESPACE = process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE as string;

export interface SendWhatsAppOtpParams {
    mobile: string;
    otp: string;
    name?: string;
}

export const sendWhatsAppOtp = async ({
    mobile,
    otp,
}: SendWhatsAppOtpParams): Promise<any> => {
    try {
        const payload = {
            integrated_number: WHATSAPP_NUMBER,
            content_type: "template",
            payload: {
                messaging_product: "whatsapp",
                type: "template",
                template: {
                    name: TEMPLATE_NAME,
                    language: {
                        code: "en",
                        policy: "deterministic",
                    },
                    namespace: TEMPLATE_NAMESPACE,
                    to_and_components: [
                        {
                            to: [`91${mobile}`],
                            components: {
                                body_1: {
                                    type: "text",
                                    value: otp,
                                },
                                button_1: {
                                    type: "text",
                                    subtype: "url",
                                    value: otp,
                                },
                            },
                        },
                    ],
                },
            },
        };

        const response = await axios.post(BASE_URL, payload, {
            headers: {
                authkey: AUTH_KEY,
                "Content-Type": "application/json",
            },
        });

        return response.data;
    } catch (error: any) {
        console.error("WhatsApp OTP Error:", error.response?.data || error.message);
        throw error.response?.data || error.message;
    }
};