import { firebaseMessaging } from "../config/firebase.js";

export const sendPushNotification = async (fcmTokens, title, body, data = {}) => {
  if (!fcmTokens) {
    return false;
  }

  const tokenList = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
  const validTokens = tokenList.filter(
    (token) => token && token !== "dummy" && typeof token === "string" && token.trim().length > 0
  );

  if (validTokens.length === 0) {
    return false;
  }

  if (!firebaseMessaging) {
    console.warn("[FCM] Firebase messaging is not configured. Push notification skipped.");
    return false;
  }

  try {
    const stringifiedData = Object.fromEntries(
      Object.entries(data).map(([key, val]) => [
        key,
        typeof val === "string" ? val : JSON.stringify(val),
      ])
    );

    const sendPromises = validTokens.map((token) =>
      firebaseMessaging
        .send({
          token: token.trim(),
          notification: {
            title,
            body,
          },
          data: stringifiedData,
        })
        .catch((error) => {
          console.error(`[FCM] Push send failed for token ${token.slice(0, 10)}...:`, error.message);
          return null;
        })
    );

    await Promise.all(sendPromises);
    return true;
  } catch (error) {
    console.error("[FCM] Push notification dispatch error:", error.message);
    return false;
  }
};

