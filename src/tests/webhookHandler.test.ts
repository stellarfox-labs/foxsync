/**
 * End-to-end tests for webhook handler using mock payloads.
 * Closes #9
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ContributionEvent } from "../types.js";

// Mock all external dependencies
vi.mock("../stellar/reputationClient.js", () => ({
  awardFoxPoints: vi.fn().mockResolvedValue("mock-tx-e2e-hash"),
  recordRejection: vi.fn().mockResolvedValue("mock-tx-reject-hash"),
}));

vi.mock("../services/grantfoxSync.js", () => ({
  syncToGrantFox: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("fs", () => ({
  readFileSync: vi.fn(() => "[]"),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));

const { processContributionEvent } = await import("../services/contributionProcessor.js");
const { registerContributor } = await import("../github/contributorRegistry.js");
const { awardFoxPoints } = await import("../stellar/reputationClient.js");
const { calculatePoints } = await import("../github/pointsCalculator.js");

const STELLAR_ADDR = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

// ── Mock GitHub PR merged payload ─────────────────────────────────────────────
const PR_MERGED_EVENT: ContributionEvent = {
  number: 42,
  repo: "stellarfox-labs/foxlock-protocol",
  contributor: "e2e-test-user",
  eventType: "pr_merged",
  title: "feat: add multi-token support",
  url: "https://github.com/stellarfox-labs/foxlock-protocol/pull/42",
  timestamp: new Date().toISOString(),
  labels: ["complexity:high"],
};

// ── Mock GitHub issue closed payload ─────────────────────────────────────────
const ISSUE_CLOSED_EVENT: ContributionEvent = {
  number: 15,
  repo: "stellarfox-labs/foxsync",
  contributor: "e2e-test-user",
  eventType: "issue_closed",
  title: "fix: retry logic for Stellar RPC calls",
  url: "https://github.com/stellarfox-labs/foxsync/issues/15",
  timestamp: new Date().toISOString(),
  labels: ["type:bug", "complexity:medium"],
};

describe("Webhook E2E — PR merged flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerContributor("e2e-test-user", STELLAR_ADDR);
  });

  it("awards correct FoxPoints for complexity:high PR", async () => {
    const result = await processContributionEvent(PR_MERGED_EVENT);

    expect(result.success).toBe(true);
    expect(result.foxPointsAwarded).toBe(80); // complexity:high = 80
    expect(result.stellarTxHash).toBe("mock-tx-e2e-hash");
    expect(awardFoxPoints).toHaveBeenCalledWith(STELLAR_ADDR, 80);
  });

  it("returns correct event metadata in result", async () => {
    const result = await processContributionEvent(PR_MERGED_EVENT);

    expect(result.event.repo).toBe("stellarfox-labs/foxlock-protocol");
    expect(result.event.contributor).toBe("e2e-test-user");
    expect(result.event.eventType).toBe("pr_merged");
    expect(result.event.number).toBe(42);
  });

  it("processes issue_closed event correctly", async () => {
    const result = await processContributionEvent(ISSUE_CLOSED_EVENT);

    expect(result.success).toBe(true);
    expect(result.foxPointsAwarded).toBe(30); // type:bug = 30 (first match)
    expect(awardFoxPoints).toHaveBeenCalledWith(STELLAR_ADDR, 30);
  });
});

describe("Webhook E2E — Points calculation accuracy", () => {
  it("complexity:critical = 150 points", () => {
    expect(calculatePoints(["complexity:critical"])).toBe(150);
  });

  it("complexity:high = 80 points", () => {
    expect(calculatePoints(["complexity:high"])).toBe(80);
  });

  it("complexity:medium = 40 points", () => {
    expect(calculatePoints(["complexity:medium"])).toBe(40);
  });

  it("complexity:low = 15 points", () => {
    expect(calculatePoints(["complexity:low"])).toBe(15);
  });

  it("type:feature = 60 points", () => {
    expect(calculatePoints(["type:feature"])).toBe(60);
  });

  it("type:bug = 30 points", () => {
    expect(calculatePoints(["type:bug"])).toBe(30);
  });

  it("no labels = 10 default points", () => {
    expect(calculatePoints([])).toBe(10);
  });

  it("first matching rule wins with multiple labels", () => {
    // complexity:critical appears before type:feature in rules
    expect(calculatePoints(["complexity:critical", "type:feature"])).toBe(150);
  });
});

describe("Webhook E2E — Unregistered contributor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fails gracefully when contributor has no Stellar address", async () => {
    const result = await processContributionEvent({
      ...PR_MERGED_EVENT,
      contributor: "totally-unregistered-xyz-999",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("no registered Stellar address");
    expect(awardFoxPoints).not.toHaveBeenCalled();
  });
});

describe("Webhook E2E — Stellar RPC failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerContributor("e2e-test-user", STELLAR_ADDR);
  });

  it("returns failure result when RPC throws", async () => {
    vi.mocked(awardFoxPoints).mockRejectedValueOnce(new Error("RPC connection timeout"));

    const result = await processContributionEvent(PR_MERGED_EVENT);

    expect(result.success).toBe(false);
    expect(result.error).toContain("On-chain");
    expect(result.error).toContain("RPC connection timeout");
  });
});
