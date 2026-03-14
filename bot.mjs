/**
 * BugBot — Telegram bot powered by Claude Code CLI with worktree workflow:
 * - Creates git worktree + branch for each task
 * - Pushes branch and creates PR/MR (GitHub or GitLab)
 * - Limit: max N active chats across all users
 *
 * Dependencies: grammy, dotenv
 * Requirements: Claude Code CLI + gh/glab CLI installed and authorized
 */

import { Bot } from "grammy";
import { existsSync } from "node:fs";
import {
  BOT_TOKEN,
  PROJECT_DIR,
  WORKTREE_MODE,
  PR_TARGET_BRANCH,
  MAX_ACTIVE_CHATS,
  ALLOWED_USERS,
  USER_GITHUB_MAP,
  BOT_LANG,
  GIT_PLATFORM,
  MERGE_DEV_BRANCH,
  MERGE_PROD_BRANCH,
} from "./src/config.mjs";
import { t } from "./src/i18n.mjs";
import { isAllowed, shell } from "./src/utils.mjs";
import { reapExpiredSessions } from "./src/session.mjs";
import { cleanupOrphanedWorktrees } from "./src/worktree.mjs";
import { registerCommands } from "./src/commands.mjs";
import { registerMessageHandlers } from "./src/messages.mjs";

// ── Bot ──────────────────────────────────────────────────────

const bot = new Bot(BOT_TOKEN);

// Middleware: whitelist
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) {
    return;
  }
  await next();
});

// Register commands and message handlers
registerCommands(bot);
registerMessageHandlers(bot);

// Error handler
bot.catch((err) => {
  console.error(`Grammy error:`, err.error);
});

// ── Startup ──────────────────────────────────────────────────

async function main() {
  if (!existsSync(PROJECT_DIR)) {
    console.error(`PROJECT_DIR does not exist: ${PROJECT_DIR}`);
    console.error("Bot must run on a server with access to the project.");
    process.exit(1);
  }

  try {
    shell("git rev-parse --git-dir", PROJECT_DIR);
  } catch {
    console.error(`${PROJECT_DIR} is not a git repository.`);
    process.exit(1);
  }

  cleanupOrphanedWorktrees();

  setInterval(reapExpiredSessions, 10 * 60 * 1000);

  // Clear global commands so strangers see nothing
  await bot.api.setMyCommands([]);

  // Set commands only for allowed users (per-user scope)
  const commands = [
    { command: "start", description: t("cmd_start") },
    { command: "new", description: t("cmd_new") },
    { command: "done", description: t("cmd_done") },
    { command: "status", description: t("cmd_status") },
    { command: "sessions", description: t("cmd_sessions") },
    { command: "stop", description: t("cmd_stop") },
    { command: "drop", description: t("cmd_drop") },
    { command: "merge_dev", description: t("cmd_merge_dev") },
    { command: "merge_prod", description: t("cmd_merge_prod") },
    { command: "id", description: t("cmd_id") },
  ];
  for (const userId of ALLOWED_USERS) {
    try {
      await bot.api.setMyCommands(commands, {
        scope: { type: "chat", chat_id: userId },
      });
    } catch {
      // User hasn't started the bot yet — skip silently
    }
  }

  const me = await bot.api.getMe();
  console.log(`BugBot started: @${me.username}`);
  console.log(`Lang: ${BOT_LANG}`);
  console.log(`Project: ${PROJECT_DIR}`);
  console.log(`Worktree mode: ${WORKTREE_MODE}`);
  console.log(`Platform: ${GIT_PLATFORM}`);
  console.log(`PR target: ${PR_TARGET_BRANCH}`);
  console.log(`Merge dev: ${PR_TARGET_BRANCH} → ${MERGE_DEV_BRANCH}`);
  console.log(`Merge prod: ${MERGE_DEV_BRANCH} → ${MERGE_PROD_BRANCH}`);
  console.log(`Max chats: ${MAX_ACTIVE_CHATS}`);
  console.log(`Whitelist: [${[...ALLOWED_USERS].join(", ")}]`);
  console.log(`GitHub map: ${JSON.stringify(Object.fromEntries(USER_GITHUB_MAP))}`);

  bot.start({ drop_pending_updates: true });
}

main();
