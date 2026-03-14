import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import {
  BOT_TOKEN,
  MAX_ACTIVE_CHATS,
  RATE_LIMIT_MESSAGES,
  RATE_LIMIT_WINDOW,
  TIMEOUT_SEC,
} from "./config.mjs";
import { t } from "./i18n.mjs";
import { getChatKey, checkRateLimit, mdToTgHtml, splitMessage } from "./utils.mjs";
import { activeSessions, activeRequests, getOrCreateSession } from "./session.mjs";
import { callClaude } from "./claude.mjs";

// ── Photo handling ──────────────────────────────────────────

const PHOTO_TMP_DIR = join(tmpdir(), "bugbot-photos");

async function downloadTgPhoto(ctx) {
  if (!existsSync(PHOTO_TMP_DIR)) mkdirSync(PHOTO_TMP_DIR, { recursive: true });

  const photos = ctx.message.photo;
  const biggest = photos[photos.length - 1];
  const file = await ctx.api.getFile(biggest.file_id);
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download photo: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const ext = file.file_path?.split(".").pop() || "jpg";
  const filename = `${randomBytes(8).toString("hex")}.${ext}`;
  const localPath = join(PHOTO_TMP_DIR, filename);
  writeFileSync(localPath, buf);

  return localPath;
}

// ── Media group buffer ──────────────────────────────────────

/** @type {Map<string, { ctx: any, caption: string, photos: Promise<string>[], timer: any }>} */
const mediaGroupBuffer = new Map();
const MEDIA_GROUP_WAIT_MS = 1500;

// ── Main message handler ────────────────────────────────────

async function handleMessage(ctx, bot, userText, imagePaths) {
  const userId = ctx.from.id;
  const chatKey = getChatKey(ctx);

  if (activeRequests.has(chatKey)) {
    await ctx.reply(`⏳ ${t("request_in_progress")}`);
    return;
  }

  if (!checkRateLimit(userId)) {
    await ctx.reply(`⏳ ${t("rate_limit_hit", RATE_LIMIT_MESSAGES, RATE_LIMIT_WINDOW / 1000)}`);
    return;
  }

  let session = activeSessions.get(chatKey);

  if (!session) {
    if (activeSessions.size >= MAX_ACTIVE_CHATS) {
      await ctx.reply(`⛔ ${t("chat_limit_msg", MAX_ACTIVE_CHATS)}`);
      return;
    }

    try {
      session = getOrCreateSession(chatKey, userId);
      if (!session) {
        await ctx.reply(`⛔ ${t("chat_limit_reached", MAX_ACTIVE_CHATS)}`);
        return;
      }
      await ctx.reply(
        `🌿 ${t("auto_session_created", session.branchName)}`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error("Auto-session creation failed:", err.message);
      await ctx.reply(`❌ ${t("auto_session_failed", err.message.slice(0, 200))}`);
      return;
    }
  }

  let prompt = userText || "";
  if (imagePaths && imagePaths.length > 0) {
    const pathsList = imagePaths.map((p, i) => `  ${i + 1}. ${p}`).join("\n");
    const imgNote = t("image_prompt", imagePaths.length, pathsList);
    prompt = prompt ? `${imgNote}\n\n${prompt}` : `${imgNote}\n${t("image_describe")}`;
  }

  if (!prompt.trim()) return;

  session.messageCount++;
  session.totalChars += prompt.length;
  if (userText) session.userMessages.push(userText);

  const CONTEXT_WARN_MESSAGES = 25;
  const CONTEXT_WARN_CHARS = 50_000;
  if (
    session.messageCount === CONTEXT_WARN_MESSAGES ||
    (session.totalChars > CONTEXT_WARN_CHARS &&
      session.totalChars - prompt.length <= CONTEXT_WARN_CHARS)
  ) {
    await ctx.reply(
      `⚠️ ${t("context_warning", session.messageCount, Math.round(session.totalChars / 1000))}`
    );
  }

  activeRequests.add(chatKey);

  const thinkingText = `🧠 ${t("thinking")}`;
  const progressMsg = await ctx.reply(thinkingText, { parse_mode: "HTML" });
  const progressChatId = progressMsg.chat.id;
  const progressMsgId = progressMsg.message_id;
  let lastProgressText = thinkingText;
  let lastEditTime = 0;

  const typingInterval = setInterval(() => {
    ctx.replyWithChatAction("typing").catch(() => {});
  }, 4000);

  const onProgress = (lines) => {
    const now = Date.now();
    if (now - lastEditTime < 2000) return;
    lastEditTime = now;

    const visible = lines.slice(-15);
    const text = `🔧 <b>${t("working")}</b>\n` + visible.join("\n");

    if (text === lastProgressText) return;
    lastProgressText = text;

    bot.api.editMessageText(progressChatId, progressMsgId, text, {
      parse_mode: "HTML",
    }).catch(() => {});
  };

  try {
    const result = await callClaude(prompt, session, onProgress);

    if (result.sessionId) {
      session.sessionId = result.sessionId;
    }
    session.totalChars += result.text.length;

    const costStr = result.costUsd != null ? ` · $${Number(result.costUsd).toFixed(4)}` : "";
    const summary = `✅ ${t("done_summary", result.toolCount, costStr)}`;
    bot.api.editMessageText(progressChatId, progressMsgId, summary, {
      parse_mode: "HTML",
    }).catch(() => {});

    const parts = splitMessage(result.text);
    for (const part of parts) {
      try {
        await ctx.reply(mdToTgHtml(part), { parse_mode: "HTML" });
      } catch {
        await ctx.reply(part);
      }
    }

    console.log(
      `[${new Date().toISOString()}] user=${userId} chat=${chatKey} branch=${session.branchName} session=${result.sessionId?.slice(0, 8) || "new"} tools=${result.toolCount} len=${result.text.length}`
    );
  } catch (err) {
    console.error(`Error for chat ${chatKey}:`, err.message);

    bot.api.editMessageText(progressChatId, progressMsgId, `❌ ${err.message.slice(0, 200)}`, {
      parse_mode: "HTML",
    }).catch(() => {});

    if (err.message.includes("ENOENT") || err.message.includes(t("cli_spawn_error", ""))) {
      await ctx.reply(`❌ ${t("cli_not_found")}`);
    } else if (
      err.message.includes("timeout") ||
      err.message.includes("TIMEOUT")
    ) {
      await ctx.reply(`⏱ ${t("timeout_hit", TIMEOUT_SEC)}`);
    }
  } finally {
    clearInterval(typingInterval);
    activeRequests.delete(chatKey);
    if (imagePaths) {
      for (const p of imagePaths) {
        try { rmSync(p, { force: true }); } catch {}
      }
    }
  }
}

// ── Register message handlers ───────────────────────────────

export function registerMessageHandlers(bot) {
  bot.on("message:text", (ctx) => handleMessage(ctx, bot, ctx.message.text, null));

  bot.on("message:photo", async (ctx) => {
    const mediaGroupId = ctx.message.media_group_id;

    if (!mediaGroupId) {
      try {
        const imagePath = await downloadTgPhoto(ctx);
        await handleMessage(ctx, bot, ctx.message.caption || "", [imagePath]);
      } catch (err) {
        console.error("Photo download failed:", err.message);
        await ctx.reply(`❌ ${t("photo_failed", err.message.slice(0, 200))}`);
      }
      return;
    }

    if (!mediaGroupBuffer.has(mediaGroupId)) {
      mediaGroupBuffer.set(mediaGroupId, {
        ctx,
        caption: ctx.message.caption || "",
        photos: [],
        timer: null,
      });
    }

    const group = mediaGroupBuffer.get(mediaGroupId);

    if (ctx.message.caption && !group.caption) {
      group.caption = ctx.message.caption;
    }

    group.photos.push(downloadTgPhoto(ctx));

    if (group.timer) clearTimeout(group.timer);
    group.timer = setTimeout(async () => {
      mediaGroupBuffer.delete(mediaGroupId);
      try {
        const paths = await Promise.all(group.photos);
        await handleMessage(group.ctx, bot, group.caption, paths);
      } catch (err) {
        console.error("Media group processing failed:", err.message);
        await group.ctx.reply(`❌ ${t("photo_failed", err.message.slice(0, 200))}`);
      }
    }, MEDIA_GROUP_WAIT_MS);
  });
}
