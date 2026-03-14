import { spawn, execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { CLAUDE_BIN, MODEL, SYSTEM_PROMPT, MAX_TURNS, TIMEOUT_SEC } from "./config.mjs";
import { t } from "./i18n.mjs";

// ── Progress formatting ─────────────────────────────────────

function shortPath(p) {
  if (!p) return "";
  return p.replace(/\\/g, "/").replace(/.*\/([\w-]+\/[\w.-]+)$/, "$1");
}

function toolIcon(name) {
  switch (name) {
    case "Read": case "NotebookRead": return "📂 Read";
    case "Edit": return "✏️ Edit";
    case "Write": case "NotebookEdit": return "📝 Write";
    case "Glob": return "🔍 Glob";
    case "Grep": return "🔍 Grep";
    case "Bash": return "⚡ Bash";
    case "Agent": return "🤖 Agent";
    case "TodoWrite": return "📋 Tasks";
    default: return `◆ ${name}`;
  }
}

export function formatToolLine(name, input) {
  const icon = toolIcon(name);
  const fp = input.file_path || input.path || "";
  const short = shortPath(fp);

  switch (name) {
    case "Read": case "NotebookRead": return `${icon}  ${short}`;
    case "Edit": case "Write": case "NotebookEdit": return `${icon}  ${short}`;
    case "Glob": return `${icon}  ${input.pattern || ""}`;
    case "Grep": return `${icon}  ${input.pattern || ""}`;
    case "Bash": return `${icon}  ${(input.command || "").substring(0, 60)}`;
    case "Agent": return `${icon}  ${t("agent_working")}`;
    case "TodoWrite": {
      const todos = input.todos || [];
      return `${icon}\n` + todos.map(t => {
        const s = t.status === "completed" ? "✅" : t.status === "in_progress" ? "⚙️" : "➖";
        return `  ${s} ${t.content}`;
      }).join("\n");
    }
    default: return icon;
  }
}

// ── PR summary generation ───────────────────────────────────

export function generatePrSummary(session, commitLog) {
  const msgs = session.userMessages.slice(0, 10).join("\n---\n");
  const prompt = t("pr_prompt", msgs, commitLog);

  try {
    const result = execSync(
      `${CLAUDE_BIN} -p ${JSON.stringify(prompt)} --output-format json --max-turns 1 --dangerously-skip-permissions`,
      {
        cwd: session.worktreePath,
        encoding: "utf-8",
        timeout: 60_000,
        env: { ...process.env, NO_COLOR: "1" },
      }
    );
    const parsed = JSON.parse(result);
    const text = parsed.result || parsed.text || result;
    const match = text.match(/\{[\s\S]*"title"[\s\S]*"body"[\s\S]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      return { title: obj.title?.slice(0, 70) || "", body: obj.body || "" };
    }
  } catch (err) {
    console.error("PR summary generation failed:", err.message);
  }
  return null;
}

// ── Main Claude CLI call (stream-json) ──────────────────────

export function callClaude(prompt, session, onProgress) {
  return new Promise((resolve, reject) => {
    const args = ["-p", prompt, "--output-format", "stream-json", "--verbose", "--dangerously-skip-permissions"];

    if (MAX_TURNS) args.push("--max-turns", String(MAX_TURNS));
    if (MODEL) args.push("--model", MODEL);
    if (SYSTEM_PROMPT) args.push("--system-prompt", SYSTEM_PROMPT);
    if (session.sessionId) args.push("--resume", session.sessionId);

    const proc = spawn(CLAUDE_BIN, args, {
      timeout: TIMEOUT_SEC * 1000,
      cwd: session.worktreePath,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });

    let textOutput = "";
    let sessionId = session.sessionId;
    let costUsd = null;
    const progressLines = [];
    const pending = {};

    rl.on("line", (line) => {
      let obj;
      try { obj = JSON.parse(line); } catch { return; }

      if (obj.type === "content_block_start" && obj.content_block?.type === "tool_use") {
        const idx = obj.index ?? 0;
        pending[idx] = {
          name: obj.content_block.name,
          inputJson: "",
          directInput: obj.content_block.input,
        };
        return;
      }

      if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta") {
        if (obj.delta.text) textOutput += obj.delta.text;
        return;
      }

      if (obj.type === "content_block_delta" && obj.delta?.type === "input_json_delta") {
        const idx = obj.index ?? 0;
        if (pending[idx]) pending[idx].inputJson += (obj.delta.partial_json || "");
        return;
      }

      if (obj.type === "content_block_stop") {
        const idx = obj.index ?? 0;
        const tool = pending[idx];
        if (tool) {
          let input = {};
          if (tool.inputJson) {
            try { input = JSON.parse(tool.inputJson); } catch {}
          } else if (tool.directInput && typeof tool.directInput === "object") {
            input = tool.directInput;
          }
          progressLines.push(formatToolLine(tool.name, input));
          delete pending[idx];
          if (onProgress) onProgress([...progressLines]);
        }
        return;
      }

      if (obj.type === "tool_use" && obj.name) {
        progressLines.push(formatToolLine(obj.name, obj.input || {}));
        if (onProgress) onProgress([...progressLines]);
        return;
      }

      const msg = obj.message || obj;
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "tool_use") {
            progressLines.push(formatToolLine(block.name, block.input || {}));
          }
          if (block.type === "text" && block.text) {
            textOutput += block.text;
          }
        }
        if (progressLines.length > 0 && onProgress) onProgress([...progressLines]);
      }

      if (obj.type === "result") {
        sessionId = obj.session_id || sessionId;
        costUsd = obj.cost_usd ?? null;
      }
    });

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (!sessionId || sessionId === session.sessionId) {
        const match = stderr.match(/session_id[:\s]+"?([a-f0-9-]+)"?/i);
        if (match) sessionId = match[1];
      }

      if (code === 0 || textOutput.trim()) {
        resolve({
          text: textOutput.trim() || t("empty_response"),
          sessionId,
          costUsd,
          toolCount: progressLines.length,
        });
      } else {
        reject(
          new Error(t("cli_exit_error", code, stderr.trim().slice(0, 500)))
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(t("cli_spawn_error", err.message)));
    });

    proc.stdin.end();
  });
}
