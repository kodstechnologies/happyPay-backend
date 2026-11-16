import axios from "axios";
import { SMS_AUTH_KEY, SMS_SENDERID } from "../config/index.js";

// templateId = "1707175101642561256
const sendSMS = async (mobileNumber, message, templateId = "1707175101642561256") => {
    try {
        // Check if SMS credentials are configured
        if (!SMS_AUTH_KEY || !SMS_SENDERID) {
            throw new Error("SMS credentials not configured. Please set SMS_AUTH_KEY and SMS_SENDERID in environment variables.");
        }

        console.log("🚀 ~ SMS_SENDERID:", SMS_SENDERID)
        console.log("🚀 ~ SMS_AUTH_KEY:", SMS_AUTH_KEY)
        if (!mobileNumber || !message) {
            throw new Error("Mobile number and message are required");
        }

        const payload = {
            message,
            senderId: SMS_SENDERID,
            number: mobileNumber,
            templateId,
        };

        const config = {
            method: "post",
            url: "https://smsapi.edumarcsms.com/api/v1/sendsms",
            headers: {
                "Content-Type": "application/json",
                APIKEY: SMS_AUTH_KEY,
            },
            data: JSON.stringify(payload),
        };

        const response = await axios.request(config);

        if (response.status === 200) {
            console.log("SMS sent successfully:", response.data);
            return response.data;
        } else {
            console.error("Failed to send SMS:", response.data);
            return null;
        }
    } catch (error) {
        console.error(
            "Error while sending SMS:",
            error.response?.data || error.message
        );
        throw error;
    }
};

export default sendSMS;
