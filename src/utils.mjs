import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  ALLOWED_USERS,
  BRANCH_PREFIX,
  RATE_LIMIT_MESSAGES,
  RATE_LIMIT_WINDOW,
} from "./config.mjs";

// ── Rate limits store ───────────────────────────────────────

/** @type {Map<number, number[]>} */
const rateLimits = new Map();

// ── Helpers ─────────────────────────────────────────────────

export function isAllowed(userId) {
  if (ALLOWED_USERS.size === 0) return false;
  return ALLOWED_USERS.has(userId);
}

export function checkRateLimit(userId) {
  const now = Date.now();
  let timestamps = rateLimits.get(userId) || [];
  timestamps = timestamps.filter((ts) => ts > now - RATE_LIMIT_WINDOW);
  if (timestamps.length >= RATE_LIMIT_MESSAGES) {
    rateLimits.set(userId, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimits.set(userId, timestamps);
  return true;
}

export function getChatKey(ctx) {
  const threadId = ctx.message?.message_thread_id;
  if (threadId) {
    return `${ctx.chat.id}:${threadId}`;
  }
  return String(ctx.chat.id);
}

/**
 * Converts Claude's Markdown response to Telegram HTML.
 */
export function mdToTgHtml(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const cls = lang ? ` class="language-${lang}"` : "";
      return `<pre><code${cls}>${code.trimEnd()}</code></pre>`;
    }
  );

  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  html = html.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "<i>$1</i>");
  html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<i>$1</i>");

  return html;
}

export function splitMessage(text, maxLength = 4000) {
  if (text.length <= maxLength) return [text];
  const parts = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }
    let pos = remaining.lastIndexOf("\n", maxLength);
    if (pos === -1) pos = remaining.lastIndexOf(" ", maxLength);
    if (pos === -1) pos = maxLength;
    parts.push(remaining.slice(0, pos));
    remaining = remaining.slice(pos).trimStart();
  }
  return parts;
}

export function generateBranchName() {
  const id = randomBytes(4).toString("hex");
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${BRANCH_PREFIX}${ts}-${id}`;
}

export function shell(cmd, cwd) {
  return execSync(cmd, {
    cwd,
    encoding: "utf-8",
    timeout: 30_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}
