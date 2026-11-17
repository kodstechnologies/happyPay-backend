import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import env from "./config/env.js";
import logger from "./utils/logger.js";
import { initializeSocket } from "./sockets/socket.server.js";
import {
  startSubscriptionExpiryCron,
  stopSubscriptionExpiryCron,
  runSubscriptionExpiryCheck,
} from "./cron/subscriptionExpiry.cron.js";

let server;

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error(
    {
      error,
    },
    "UNCAUGHT EXCEPTION! Shutting down..."
  );

  process.exit(1);
});

const startServer = async () => {
  try {
    await connectDB();

    const PORT = env.PORT;
    const httpServer = http.createServer(app);

    initializeSocket(httpServer);

    server = httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${env.NODE_ENV}`);
    });

    // Start cron jobs
    startSubscriptionExpiryCron();

    // Run an initial expiry check now that the DB is connected
    await runSubscriptionExpiryCheck();

  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error(
    {
      reason,
    },
    "UNHANDLED REJECTION! Shutting down gracefully..."
  );

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle termination signals
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");

  // Stop cron jobs
  stopSubscriptionExpiryCron();

  if (server) {
    server.close(() => {
      logger.info("Process terminated.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");

  // Stop cron jobs
  stopSubscriptionExpiryCron();

  if (server) {
    server.close(() => {
      logger.info("Process terminated.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

startServer();