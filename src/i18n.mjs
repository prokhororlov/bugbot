const translations = {
  en: {
    // bot.mjs — whitelist
    access_denied: (userId) => `Access denied.\nYour ID: <code>${userId}</code>`,

    // bot.mjs — setMyCommands
    cmd_start: "Start",
    cmd_new: "New session (branch + worktree)",
    cmd_done: "Finish → push + PR",
    cmd_status: "Current session status",
    cmd_sessions: "All active sessions",
    cmd_drop: "Delete session without PR",
    cmd_merge_dev: "Merge dev (admin)",
    cmd_merge_prod: "Merge prod (admin)",
    cmd_id: "My Telegram ID",
    cmd_stop: "Stop current agent",

    // bot.mjs — startup logs (console, not translated to keep logs in English)

    // commands.mjs — /start
    start_hello:
      "Hi! I'm BugBot.\n\n" +
      "I work via git worktree → branch → PR.\n\n" +
      "Commands:\n" +
      "/new — new session (branch)\n" +
      "/done — finish, push & create PR\n" +
      "/stop — stop current agent\n" +
      "/status — current session status\n" +
      "/sessions — all active sessions\n" +
      "/drop — delete session without PR\n" +
      "/merge_dev — merge dev branch (admin)\n" +
      "/merge_prod — merge prod branch (admin)\n" +
      "/id — your Telegram ID",

    // commands.mjs — /new
    old_session_deleted: (branch) => `Old session <code>${branch}</code> deleted.`,
    chat_limit_full: (max) =>
      `Active chat limit: ${max}/${max}.\nFinish one (/done or /drop) before creating a new one.`,
    chat_limit_reached: (max) => `Active chat limit (${max}) reached.`,
    new_session_created: (branch, wtPath, target) =>
      `New session created!\n\n` +
      `Branch: <code>${branch}</code>\n` +
      `Worktree: <code>${wtPath}</code>\n` +
      `PR target: <code>${target}</code>\n\n` +
      `Send your task — I'll start working.`,
    session_create_failed: (err) => `Failed to create session: ${err}`,

    // commands.mjs — /done
    no_active_session: "No active session in this chat. Use /new.",
    no_commits: "No new commits in the branch. Nothing to push.\nUse /drop to delete the session, or keep working.",
    pushing_branch: "Pushing branch...",
    generating_pr: "Generating PR description...",
    creating_pr: "Creating PR...",
    done_success: (prUrl, branch, target) =>
      `Done!\n\n` +
      `PR: ${prUrl}\n` +
      `Branch: <code>${branch}</code> → <code>${target}</code>\n\n` +
      `Session finished.`,
    error_generic: (err) => `Error: ${err}`,

    // commands.mjs — /status
    status_info: (branch, wtPath, user, commits, age, sessionId, msgCount, chars, active, max) =>
      `Session info:\n\n` +
      `Branch: <code>${branch}</code>\n` +
      `Worktree: <code>${wtPath}</code>\n` +
      `Created by: ${user}\n` +
      `Commits: ${commits}\n` +
      `Age: ${age} min\n` +
      `Claude session: <code>${sessionId}</code>\n` +
      `Context: ${msgCount} msgs, ~${chars}k chars\n\n` +
      `Active chats: ${active}/${max}`,

    // commands.mjs — /sessions
    no_sessions: (max) => `No active sessions. (0/${max})`,
    sessions_header: (active, max) => `Active sessions (${active}/${max}):\n\n`,

    // commands.mjs — /drop
    no_session_to_drop: "No active session in this chat.",
    session_dropped: (branch) =>
      `Session deleted.\nBranch <code>${branch}</code> deleted. Worktree cleaned up.`,

    // commands.mjs — /id
    id_info: (tgId, ghUser) =>
      `Telegram ID: <code>${tgId}</code>\n` +
      `GitHub: <code>${ghUser || "not set"}</code>`,

    // commands.mjs — /stop
    nothing_to_stop: "No active request to stop.",
    stopped: "Agent stopped.",

    // commands.mjs — /merge_dev, /merge_prod
    admin_only: "This command is admin-only.",
    merging_dev: (src, dst) => `Merging ${src} into ${dst}...`,
    merge_dev_ok: (src, dst) => `Merged ${src} into ${dst} and pushed.\n\nAfter verifying, merge to prod: /merge_prod`,
    merge_dev_failed: (err) => `Merge dev failed: ${err}`,
    merge_prod_blocked_none: "Dev has not been merged yet.",
    merge_prod_blocked_failed: "Last dev merge failed.",
    merge_prod_blocked_running: "Dev merge is still running.",
    merge_prod_blocked: (reason) => `Cannot merge to prod.\n${reason}\n\nRun /merge_dev first`,
    merging_prod: (src, dst) => `Merging ${src} into ${dst}...`,
    merge_prod_ok: (src, dst) => `Merged ${src} into ${dst} and pushed.`,
    merge_prod_failed: (err) => `Merge prod failed: ${err}`,

    // messages.mjs
    request_in_progress: "Previous request is still running. Please wait.",
    rate_limit_hit: (msgs, sec) => `Rate limit: ${msgs} messages per ${sec}s.`,
    chat_limit_msg: (max) =>
      `Active chat limit (${max}) reached.\nFinish a session (/done or /drop), then write again.`,
    auto_session_created: (branch) => `Session created: <code>${branch}</code>\nProcessing request...`,
    auto_session_failed: (err) => `Failed to create session: ${err}`,
    image_prompt: (count, paths) =>
      `[User sent ${count} image(s), saved at:\n${paths}\n]\nUse Read tool to view them.`,
    image_describe: "Describe what you see in the screenshots.",
    context_warning: (msgs, chars) =>
      `Session context filling up (${msgs} messages, ~${chars}k chars).\nRecommend /done + /new for a fresh session.`,
    thinking: "Thinking...",
    working: "Working:",
    done_summary: (toolCount, cost) => `Done: ${toolCount} actions${cost}`,
    photo_failed: (err) => `Failed to process photo: ${err}`,
    cli_not_found: "Claude CLI not found. Make sure `claude` is installed and in PATH.",
    timeout_hit: (sec) => `Timeout (${sec}s). Try a shorter request.`,

    // claude.mjs
    agent_working: "working...",
    empty_response: "(empty response)",
    cli_exit_error: (code, stderr) => `Claude CLI exited with code ${code}: ${stderr}`,
    cli_spawn_error: (err) => `Failed to start Claude CLI: ${err}`,

    // session.mjs
    session_expired: (branch) => `[TTL] Session ${branch} expired, removing`,

    // worktree.mjs
    cleanup_worktree: (path) => `[cleanup] Removing orphaned worktree: ${path}`,
    cleanup_branch: (branch) => `[cleanup] Removing orphaned branch: ${branch}`,

    // claude.mjs — PR summary prompt
    pr_prompt: (msgs, commitLog) =>
      `You generate title and body for a GitHub Pull Request.\n\n` +
      `User messages (requests to the bot):\n${msgs}\n\n` +
      `Commits in branch:\n${commitLog}\n\n` +
      `Reply STRICTLY in JSON format (no markdown, no \`\`\`):\n` +
      `{"title": "short title up to 70 chars in English", "body": "description of changes in 2-5 bullet points, markdown, in English"}\n\n` +
      `Title should be a meaningful description (not the branch name). Body — what was specifically done.`,

    // config.mjs — default system prompt
    default_system_prompt: "You are an AI assistant for the project. You work on a dev stand via git worktree. Respond in English.",
  },

  ru: {
    access_denied: (userId) => `Доступ запрещён.\nТвой ID: <code>${userId}</code>`,

    cmd_start: "Начать",
    cmd_new: "Новая сессия (ветка + worktree)",
    cmd_done: "Завершить → push + PR",
    cmd_status: "Статус текущей сессии",
    cmd_sessions: "Все активные сессии",
    cmd_drop: "Удалить сессию без PR",
    cmd_merge_dev: "Мерж dev (admin)",
    cmd_merge_prod: "Мерж prod (admin)",
    cmd_id: "Мой Telegram ID",
    cmd_stop: "Остановить агента",

    start_hello:
      "Привет! Я BugBot.\n\n" +
      "Работаю через git worktree → ветка → PR.\n\n" +
      "Команды:\n" +
      "/new — новый чат (сессия + ветка)\n" +
      "/done — завершить чат, запушить и создать PR\n" +
      "/stop — остановить агента\n" +
      "/status — статус текущей сессии\n" +
      "/sessions — все активные сессии\n" +
      "/drop — удалить текущую сессию без PR\n" +
      "/merge_dev — мерж dev ветки (admin)\n" +
      "/merge_prod — мерж prod ветки (admin)\n" +
      "/id — твой Telegram ID",

    old_session_deleted: (branch) => `Старая сессия <code>${branch}</code> удалена.`,
    chat_limit_full: (max) =>
      `Лимит активных чатов: ${max}/${max}.\nЗаверши один из существующих (/done или /drop) перед созданием нового.`,
    chat_limit_reached: (max) => `Лимит активных чатов (${max}) исчерпан.`,
    new_session_created: (branch, wtPath, target) =>
      `Новая сессия создана!\n\n` +
      `Ветка: <code>${branch}</code>\n` +
      `Worktree: <code>${wtPath}</code>\n` +
      `PR target: <code>${target}</code>\n\n` +
      `Пиши задачу — я начну работать.`,
    session_create_failed: (err) => `Не удалось создать сессию: ${err}`,

    no_active_session: "Нет активной сессии в этом чате. Используй /new.",
    no_commits: "В ветке нет новых коммитов. Нечего пушить.\nИспользуй /drop чтобы удалить сессию, или продолжай работу.",
    pushing_branch: "Пушу ветку...",
    generating_pr: "Генерирую описание PR...",
    creating_pr: "Создаю PR...",
    done_success: (prUrl, branch, target) =>
      `Готово!\n\n` +
      `PR: ${prUrl}\n` +
      `Ветка: <code>${branch}</code> → <code>${target}</code>\n\n` +
      `Сессия завершена.`,
    error_generic: (err) => `Ошибка: ${err}`,

    status_info: (branch, wtPath, user, commits, age, sessionId, msgCount, chars, active, max) =>
      `Сессия этого чата:\n\n` +
      `Ветка: <code>${branch}</code>\n` +
      `Worktree: <code>${wtPath}</code>\n` +
      `Создал: ${user}\n` +
      `Коммитов: ${commits}\n` +
      `Возраст: ${age} мин\n` +
      `Claude session: <code>${sessionId}</code>\n` +
      `Контекст: ${msgCount} сообщ., ~${chars}k символов\n\n` +
      `Активных чатов: ${active}/${max}`,

    no_sessions: (max) => `Нет активных сессий. (0/${max})`,
    sessions_header: (active, max) => `Активные сессии (${active}/${max}):\n\n`,

    no_session_to_drop: "Нет активной сессии в этом чате.",
    session_dropped: (branch) =>
      `Сессия удалена.\nВетка <code>${branch}</code> удалена. Worktree очищен.`,

    id_info: (tgId, ghUser) =>
      `Telegram ID: <code>${tgId}</code>\n` +
      `GitHub: <code>${ghUser || "не задан"}</code>`,

    nothing_to_stop: "Нет активного запроса для остановки.",
    stopped: "Агент остановлен.",

    admin_only: "Команда доступна только администратору.",
    merging_dev: (src, dst) => `Мержу ${src} в ${dst}...`,
    merge_dev_ok: (src, dst) => `${src} вмержен в ${dst} и запушен.\n\nПосле проверки можно мержить в прод: /merge_prod`,
    merge_dev_failed: (err) => `Не удалось выполнить мерж dev: ${err}`,
    merge_prod_blocked_none: "Dev ещё не был вмержен.",
    merge_prod_blocked_failed: "Последний мерж dev завершился с ошибкой.",
    merge_prod_blocked_running: "Мерж dev ещё выполняется.",
    merge_prod_blocked: (reason) => `Нельзя мержить в прод.\n${reason}\n\nСначала выполни /merge_dev`,
    merging_prod: (src, dst) => `Мержу ${src} в ${dst}...`,
    merge_prod_ok: (src, dst) => `${src} вмержен в ${dst} и запушен.`,
    merge_prod_failed: (err) => `Не удалось выполнить мерж prod: ${err}`,

    request_in_progress: "Предыдущий запрос ещё выполняется. Подожди.",
    rate_limit_hit: (msgs, sec) => `Лимит: ${msgs} сообщений за ${sec}с.`,
    chat_limit_msg: (max) =>
      `Лимит активных чатов (${max}) исчерпан.\nЗаверши существующую сессию (/done или /drop), затем напиши сюда снова.`,
    auto_session_created: (branch) => `Создана сессия: <code>${branch}</code>\nОбрабатываю запрос...`,
    auto_session_failed: (err) => `Не удалось создать сессию: ${err}`,
    image_prompt: (count, paths) =>
      `[Пользователь прислал ${count} изображение(й), сохранены в:\n${paths}\n]\nИспользуй Read tool чтобы посмотреть их.`,
    image_describe: "Опиши что видишь на скриншотах.",
    context_warning: (msgs, chars) =>
      `Контекст сессии заполняется (${msgs} сообщений, ~${chars}k символов).\nРекомендую /done + /new для свежей сессии.`,
    thinking: "Думаю...",
    working: "Работаю:",
    done_summary: (toolCount, cost) => `Готово: ${toolCount} действий${cost}`,
    photo_failed: (err) => `Не удалось обработать фото: ${err}`,
    cli_not_found: "Claude CLI не найден. Проверь что `claude` установлен и в PATH.",
    timeout_hit: (sec) => `Таймаут (${sec}с). Попробуй короче.`,

    agent_working: "работает...",
    empty_response: "(пустой ответ)",
    cli_exit_error: (code, stderr) => `Claude CLI завершился с кодом ${code}: ${stderr}`,
    cli_spawn_error: (err) => `Не удалось запустить Claude CLI: ${err}`,

    session_expired: (branch) => `[TTL] Сессия ${branch} просрочена, удаляю`,

    cleanup_worktree: (path) => `[cleanup] Удаляю осиротевший worktree: ${path}`,
    cleanup_branch: (branch) => `[cleanup] Удаляю осиротевшую ветку: ${branch}`,

    pr_prompt: (msgs, commitLog) =>
      `Ты генерируешь title и body для GitHub Pull Request.\n\n` +
      `Сообщения пользователя (запросы к боту):\n${msgs}\n\n` +
      `Коммиты в ветке:\n${commitLog}\n\n` +
      `Ответь СТРОГО в формате JSON (без markdown, без \`\`\`):\n` +
      `{"title": "краткий title до 70 символов на английском", "body": "описание изменений в 2-5 пунктов, markdown, на русском"}\n\n` +
      `Title должен быть осмысленным описанием задачи (не имя ветки). Body — что конкретно было сделано.`,

    default_system_prompt: "Ты — AI-ассистент проекта. Работаешь на dev-стенде через git worktree. Отвечай на русском.",
  },
};

/** @type {"en"|"ru"} */
let currentLang = "en";

export function setLang(lang) {
  if (!translations[lang]) throw new Error(`Unsupported language: ${lang}. Supported: ${Object.keys(translations).join(", ")}`);
  currentLang = lang;
}

export function t(key, ...args) {
  const val = translations[currentLang]?.[key] ?? translations.en[key];
  if (typeof val === "function") return val(...args);
  return val ?? key;
}
