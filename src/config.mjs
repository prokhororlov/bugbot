import { join } from "node:path";
import "dotenv/config";
import { setLang, t } from "./i18n.mjs";

// ── Language ─────────────────────────────────────────────────

export const BOT_LANG = process.env.BOT_LANG || "en";
setLang(BOT_LANG);

// ── Telegram ────────────────────────────────────────────────

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");

// ── Claude CLI ──────────────────────────────────────────────

export const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
export const MODEL = process.env.MODEL || "";
export const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT || t("default_system_prompt");
export const MAX_TURNS = parseInt(process.env.MAX_TURNS || "0", 10);
export const TIMEOUT_SEC = parseInt(process.env.TIMEOUT_SEC || "300", 10);

// ── Project ─────────────────────────────────────────────────

export const PROJECT_DIR = process.env.PROJECT_DIR;
if (!PROJECT_DIR) throw new Error("PROJECT_DIR is not set");
export const PR_TARGET_BRANCH = process.env.PR_TARGET_BRANCH || "dev";
export const GIT_PLATFORM = process.env.GIT_PLATFORM || "github"; // "github" or "gitlab"

// ── Worktree ────────────────────────────────────────────────

export const WORKTREE_MODE = process.env.WORKTREE_MODE === "true";
export const WORKTREE_BASE_DIR =
  process.env.WORKTREE_BASE_DIR || join(PROJECT_DIR, ".worktrees");
export const BRANCH_PREFIX = process.env.BRANCH_PREFIX || "bugbot/";

// ── Merge (admin commands) ───────────────────────────────────

export const MERGE_ADMIN_ID = parseInt(process.env.MERGE_ADMIN_ID || "0", 10);
export const MERGE_DEV_BRANCH = process.env.MERGE_DEV_BRANCH || PR_TARGET_BRANCH;
export const MERGE_PROD_BRANCH = process.env.MERGE_PROD_BRANCH || "main";

/** @type {{ status: "success"|"failed"|"running"|null, timestamp: number|null, triggeredBy: number|null }} */
export const lastDevMerge = { status: null, timestamp: null, triggeredBy: null };

// ── Whitelist ───────────────────────────────────────────────

export const ALLOWED_USERS = new Set(
  (process.env.ALLOWED_USERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
);

// ── User → GitHub username map ──────────────────────────────

export const USER_GITHUB_MAP = new Map(
  (process.env.USER_GITHUB_MAP || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [tgId, ghUser] = pair.split(":");
      return [Number(tgId), ghUser];
    })
);

// ── Rate limiting ───────────────────────────────────────────

export const RATE_LIMIT_MESSAGES = parseInt(process.env.RATE_LIMIT_MESSAGES || "20", 10);
export const RATE_LIMIT_WINDOW =
  parseInt(process.env.RATE_LIMIT_WINDOW || "60", 10) * 1000;

// ── Chats ────────────────────────────────────────────────────

export const MAX_ACTIVE_CHATS = parseInt(process.env.MAX_ACTIVE_CHATS || "3", 10);
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
