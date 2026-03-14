import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  PROJECT_DIR,
  PR_TARGET_BRANCH,
  GIT_PLATFORM,
  WORKTREE_MODE,
  WORKTREE_BASE_DIR,
  USER_GITHUB_MAP,
} from "./config.mjs";
import { t } from "./i18n.mjs";
import { shell } from "./utils.mjs";

function ensureWorktreeBaseDir() {
  if (!existsSync(WORKTREE_BASE_DIR)) {
    mkdirSync(WORKTREE_BASE_DIR, { recursive: true });
  }
}

export function createWorktree(branchName) {
  ensureWorktreeBaseDir();
  const wtPath = join(WORKTREE_BASE_DIR, branchName.replace(/\//g, "_"));

  try {
    shell(`git fetch origin ${PR_TARGET_BRANCH}`, PROJECT_DIR);
  } catch (e) {
    console.error("git fetch failed:", e.message);
  }

  shell(
    `git worktree add -b "${branchName}" "${wtPath}" "origin/${PR_TARGET_BRANCH}"`,
    PROJECT_DIR
  );

  return wtPath;
}

export function cleanupWorktree(branchName, wtPath) {
  try {
    shell(`git worktree remove "${wtPath}" --force`, PROJECT_DIR);
  } catch (e) {
    console.error(`worktree remove failed for ${branchName}: ${e.message}`);
    try {
      rmSync(wtPath, { recursive: true, force: true });
      shell("git worktree prune", PROJECT_DIR);
    } catch {}
  }
}

export function pushBranch(branchName, wtPath) {
  shell(`git push -u origin "${branchName}"`, wtPath);
}

export function createPR(branchName, title, body, requestorUserId) {
  const safeTitle = title.replace(/"/g, '\\"');
  const safeBody = body.replace(/"/g, '\\"');

  const reviewers = [];
  for (const [tgId, ghUsername] of USER_GITHUB_MAP) {
    if (tgId !== requestorUserId) {
      reviewers.push(ghUsername);
    }
  }

  let cmd;
  if (GIT_PLATFORM === "gitlab") {
    cmd = `glab mr create --source-branch "${branchName}" --target-branch "${PR_TARGET_BRANCH}" --title "${safeTitle}" --description "${safeBody}" --remove-source-branch --no-editor`;
    if (reviewers.length > 0) {
      cmd += ` --reviewer "${reviewers.join(",")}"`;
    }
  } else {
    cmd = `gh pr create --base "${PR_TARGET_BRANCH}" --head "${branchName}" --title "${safeTitle}" --body "${safeBody}"`;
    if (reviewers.length > 0) {
      cmd += ` --reviewer "${reviewers.join(",")}"`;
    }
  }

  return shell(cmd, PROJECT_DIR);
}

export function cleanupOrphanedWorktrees() {
  if (!WORKTREE_MODE || !existsSync(WORKTREE_BASE_DIR)) return;

  let wtList;
  try {
    wtList = shell("git worktree list --porcelain", PROJECT_DIR);
  } catch { return; }

  const orphaned = [];
  for (const line of wtList.split("\n")) {
    if (!line.startsWith("worktree ")) continue;
    const wtPath = line.slice("worktree ".length).trim();
    if (!wtPath.replace(/\\/g, "/").startsWith(WORKTREE_BASE_DIR.replace(/\\/g, "/"))) continue;
    orphaned.push(wtPath);
  }

  for (const wtPath of orphaned) {
    console.log(t("cleanup_worktree", wtPath));
    try { shell(`git worktree remove "${wtPath}" --force`, PROJECT_DIR); } catch {}
  }

  try {
    const branches = shell("git branch --list \"bugbot/*\"", PROJECT_DIR);
    for (const b of branches.split("\n").map(s => s.trim()).filter(Boolean)) {
      console.log(t("cleanup_branch", b));
      try { shell(`git branch -D "${b}"`, PROJECT_DIR); } catch {}
    }
  } catch {}
}
