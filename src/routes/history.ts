/**
 * Points History Route — GET /contributors/:username/points
 *
 * Returns the full FoxPoints history for a contributor including
 * timestamps, repo, PR/issue number, and points awarded.
 *
 * Resolves: https://github.com/stellarfox-labs/foxsync/issues/6
 */

import { Router, Request, Response } from "express";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { mkdirSync } from "fs";

export const historyRouter = Router();

const HISTORY_PATH = "./data/points-history.json";

export interface PointsHistoryEntry {
  id: string;
  github_username: string;
  repo: string;
  pr_or_issue_number: number;
  event_type: "pr_merged" | "issue_closed";
  title: string;
  url: string;
  fox_points: number;
  stellar_tx_hash: string;
  timestamp: string;
  labels: string[];
}

/** Load all history entries from disk */
function loadHistory(): PointsHistoryEntry[] {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, "utf-8"));
  } catch {
    return [];
  }
}

/** Save a new entry to history */
export function savePointsHistory(entry: PointsHistoryEntry): void {
  mkdirSync("./data", { recursive: true });
  const history = loadHistory();
  history.unshift(entry); // newest first
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

/**
 * GET /contributors/:username/points
 * Returns FoxPoints history for a specific contributor.
 *
 * Query params:
 *   limit  — max results (default 50, max 200)
 *   offset — pagination offset (default 0)
 *   repo   — filter by repo full name (optional)
 */
historyRouter.get(
  "/:username/points",
  (req: Request, res: Response): void => {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 200);
    const offset = parseInt(req.query.offset as string ?? "0", 10);
    const repoFilter = req.query.repo as string | undefined;

    const all = loadHistory().filter(
      (e) => e.github_username.toLowerCase() === username.toLowerCase()
    );

    const filtered = repoFilter
      ? all.filter((e) => e.repo.toLowerCase() === repoFilter.toLowerCase())
      : all;

    const paginated = filtered.slice(offset, offset + limit);
    const totalPoints = all.reduce((sum, e) => sum + e.fox_points, 0);

    res.json({
      github_username: username,
      total_fox_points: totalPoints,
      total_contributions: all.length,
      count: paginated.length,
      offset,
      limit,
      history: paginated,
    });
  }
);

/**
 * GET /contributors/:username/points/summary
 * Returns a summary of points by repo.
 */
historyRouter.get(
  "/:username/points/summary",
  (req: Request, res: Response): void => {
    const { username } = req.params;

    const all = loadHistory().filter(
      (e) => e.github_username.toLowerCase() === username.toLowerCase()
    );

    // Group by repo
    const byRepo: Record<string, { repo: string; points: number; contributions: number }> = {};
    for (const entry of all) {
      if (!byRepo[entry.repo]) {
        byRepo[entry.repo] = { repo: entry.repo, points: 0, contributions: 0 };
      }
      byRepo[entry.repo].points += entry.fox_points;
      byRepo[entry.repo].contributions += 1;
    }

    const summary = Object.values(byRepo).sort((a, b) => b.points - a.points);
    const totalPoints = all.reduce((sum, e) => sum + e.fox_points, 0);

    res.json({
      github_username: username,
      total_fox_points: totalPoints,
      total_contributions: all.length,
      by_repo: summary,
    });
  }
);
