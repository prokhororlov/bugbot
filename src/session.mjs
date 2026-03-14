import {
  PROJECT_DIR,
  WORKTREE_MODE,
  MAX_ACTIVE_CHATS,
  SESSION_TTL_MS,
} from "./config.mjs";
import { t } from "./i18n.mjs";
import { generateBranchName, shell } from "./utils.mjs";
import { createWorktree, cleanupWorktree } from "./worktree.mjs";

/**
 * @typedef {{ userId: number, chatKey: string, sessionId: string|null, branchName: string, worktreePath: string, createdAt: number, messageCount: number, totalChars: number, userMessages: string[] }} ChatSession
 */

/** @type {Map<string, ChatSession>} chatKey -> session */
export const activeSessions = new Map();

/** @type {Set<string>} chatKeys with active request */
export const activeRequests = new Set();

export function getOrCreateSession(chatKey, userId) {
  if (activeSessions.has(chatKey)) {
    return activeSessions.get(chatKey);
  }

  if (activeSessions.size >= MAX_ACTIVE_CHATS) {
    return null;
  }

  const branchName = generateBranchName();
  let worktreePath = PROJECT_DIR;

  if (WORKTREE_MODE) {
    worktreePath = createWorktree(branchName);
  }

  const session = {
    userId,
    chatKey,
    sessionId: null,
    branchName,
    worktreePath,
    createdAt: Date.now(),
    messageCount: 0,
    totalChars: 0,
    userMessages: [],
  };

  activeSessions.set(chatKey, session);
  return session;
}

export function destroySession(chatKey) {
  const session = activeSessions.get(chatKey);
  if (!session) return null;

  activeSessions.delete(chatKey);

  if (WORKTREE_MODE && session.worktreePath !== PROJECT_DIR) {
    cleanupWorktree(session.branchName, session.worktreePath);
  }

  return session;
}

export function reapExpiredSessions() {
  const now = Date.now();
  for (const [chatKey, session] of activeSessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      console.log(t("session_expired", session.branchName));
      destroySession(chatKey);
      try { shell(`git branch -D "${session.branchName}"`, PROJECT_DIR); } catch {}
    }
  }
}
