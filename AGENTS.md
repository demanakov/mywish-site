<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Проект MyWish

Лендинг на Next.js 16 · TypeScript · Tailwind v4. Устройство — `README.md`
и `docs/handoff.md`.

Форма уже подключена к действующим SQLite, amoCRM и Telegram через
`/api/leads.php`. Контракт и проверка – в `docs/crm-and-deploy.md`.
Порядок совместной работы – в `docs/team-workflow.md`. Прочитать оба документа
перед изменением формы, процесса проверки или публикации.

Дмитрий дорабатывает сайт локально и передаёт ветку или pull request Денису.
Деплой на Beget выполняется отдельным шагом после поручения Дениса на публикацию
конкретной версии. Не добавлять автоматический деплой по push или merge.

Сохранять серверное подтверждение отправки, согласие, атрибуцию и `request_id`.
Не возвращать локальную заглушку успеха и не копировать в проект рабочие токены,
закрытую конфигурацию, базу заявок или SSH-ключи.
