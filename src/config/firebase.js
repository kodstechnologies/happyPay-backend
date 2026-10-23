import env from "./env.js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import logger from "../utils/logger.js";

let firebaseApp = null;
let firebaseMessaging = null;

try {
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  if (firebaseApp) {
    firebaseMessaging = getMessaging(firebaseApp);
  } else {
    logger?.warn?.("Firebase Admin credentials not fully configured. Push notifications will be skipped.");
  }
} catch (error) {
  logger?.error?.({ error }, "Failed to initialize Firebase Admin SDK");
}

export { firebaseApp, firebaseMessaging };
