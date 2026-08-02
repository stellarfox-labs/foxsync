/**
 * GrantFox Webhook Sync Service — Entry Point
 *
 * Starts the Express server and wires up:
 * - GitHub webhook receiver with HMAC signature verification
 * - Contributor registry API
 * - Contribution processing pipeline → Stellar on-chain awards
 */

import express from "express";
import { config } from "./config.js";
import { webhookRouter } from "./routes/webhook.js";
import { registryRouter } from "./routes/registry.js";
import { historyRouter } from "./routes/history.js";
import { setContributionEventHandler } from "./github/webhookHandler.js";
import { processContributionEvent } from "./services/contributionProcessor.js";
import { mkdirSync } from "fs";

// Ensure data directory exists for registry persistence
mkdirSync("./data", { recursive: true });

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

// Raw body needed for GitHub webhook HMAC verification
app.use(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    // Convert raw buffer to string for @octokit/webhooks
    if (Buffer.isBuffer(req.body)) {
      req.body = req.body.toString("utf-8");
    }
    next();
  }
);

// JSON parsing for all other routes
app.use(express.json());

// Basic security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/webhook", webhookRouter);
app.use("/contributors", registryRouter);
app.use("/contributors", historyRouter);

// Health check — used by deployment platforms and monitoring
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "grantfox-webhook-sync",
    version: "0.1.0",
    network: config.STELLAR_NETWORK,
    timestamp: new Date().toISOString(),
  });
});

// ── Wire up contribution processing pipeline ──────────────────────────────────

setContributionEventHandler(processContributionEvent);

// ── Start server ──────────────────────────────────────────────────────────────

const server = app.listen(config.PORT, () => {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║      GrantFox Webhook Sync Service           ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`▶ Listening on port ${config.PORT}`);
  console.log(`▶ Network: ${config.STELLAR_NETWORK}`);
  console.log(`▶ Reputation contract: ${config.REPUTATION_CONTRACT_ID || "⚠ not set"}`);
  console.log(`▶ GrantFox API: ${config.GRANTFOX_API_URL ?? "not configured"}`);
  console.log("");
  console.log("Endpoints:");
  console.log(`  POST /webhook         — GitHub webhook receiver`);
  console.log(`  GET  /health          — Health check`);
  console.log(`  POST /contributors    — Register contributor Stellar address`);
  console.log(`  GET  /contributors/:u — Look up contributor`);
  console.log(`  GET  /contributors/:u/points         — FoxPoints history`);
  console.log(`  GET  /contributors/:u/points/summary — Points by repo`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

export default app;
