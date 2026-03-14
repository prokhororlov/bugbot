# BugBot

Telegram bot that writes code via [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code). Each task gets its own git branch (via worktree), result is a PR/MR. Supports GitHub and GitLab. Works with Max/Pro subscription — **no API key needed**.

```
Telegram → Grammy (Node.js) → Claude Code CLI → git worktree → push → PR/MR
```

## Quick Start

```bash
# 1. Create a Telegram bot: message @BotFather → /newbot → copy the token

# 2. Install prerequisites (Node.js 20+ required)
npm install -g @anthropic-ai/claude-code   # then run `claude` once to auth
sudo apt install gh && gh auth login        # GitHub CLI (or glab for GitLab)

# 3. Clone, install, configure
git clone <repo-url> bugbot && cd bugbot && npm install
cp .env.example .env && nano .env           # fill in TELEGRAM_BOT_TOKEN, PROJECT_DIR, ALLOWED_USERS

# 4. Run
node bot.mjs
```

Set `BOT_LANG=ru` in `.env` for Russian interface, or keep `BOT_LANG=en` for English.

## Production (systemd)

```bash
sudo tee /etc/systemd/system/bugbot.service << 'EOF'
[Unit]
Description=BugBot - Claude Code Telegram Bot
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/home/YOUR_USER/bugbot
EnvironmentFile=/home/YOUR_USER/bugbot/.env
ExecStart=/usr/bin/node /home/YOUR_USER/bugbot/bot.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now bugbot
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + command list |
| `/new` | New session (branch + worktree) |
| `/done` | Finish → push + create PR/MR |
| `/status` | Current session info |
| `/sessions` | All active sessions |
| `/drop` | Delete session without PR |
| `/merge_dev` | Merge dev branch (admin) |
| `/merge_prod` | Merge prod branch (admin) |
| `/id` | Your Telegram ID + GitHub username |

## Configuration (.env)

Full list in `.env.example`. Required:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `PROJECT_DIR` | Path to project git repo |
| `ALLOWED_USERS` | Telegram user IDs, comma-separated |

Key optional:

| Variable | Description | Default |
|----------|-------------|---------|
| `BOT_LANG` | Bot language (`en`, `ru`) | `en` |
| `WORKTREE_MODE` | Create worktree per task | `false` |
| `PR_TARGET_BRANCH` | PR target branch | `dev` |
| `MAX_TURNS` | Agent turns (0 = unlimited) | `0` |
| `MAX_ACTIVE_CHATS` | Max concurrent sessions | `3` |
| `MODEL` | Claude model | default |
| `SYSTEM_PROMPT` | System prompt override | auto |
| `GIT_PLATFORM` | `github` or `gitlab` | `github` |
| `USER_GITHUB_MAP` | `tgId:username,...` for PR/MR reviewers | — |
| `MERGE_ADMIN_ID` | Admin Telegram ID for /merge_dev, /merge_prod | — |
| `MERGE_DEV_BRANCH` | Target branch for /merge_dev | `PR_TARGET_BRANCH` |
| `MERGE_PROD_BRANCH` | Target branch for /merge_prod | `main` |

## Project Structure

```
bugbot/
├── bot.mjs              # Entry point, middleware, startup
├── src/
│   ├── config.mjs       # Environment variables
│   ├── i18n.mjs         # Translations (en/ru)
│   ├── utils.mjs        # Helpers (shell, markdown, rate limit)
│   ├── session.mjs      # Session management
│   ├── worktree.mjs     # Git worktree + push + PR
│   ├── claude.mjs       # Claude CLI call (stream-json)
│   ├── commands.mjs     # Telegram commands
│   └── messages.mjs     # Message + photo handling
├── package.json
├── .env.example
├── .env                 # Config (do not commit!)
└── .gitignore
```
