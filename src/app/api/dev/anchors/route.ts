import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Запись отступа раздела в src/app/anchors.css — только в режиме разработки.
 *
 * Его вызывает панель настройки переходов (AnchorTuner.tsx, ?anchors в
 * адресе): «Запомнить» меняет в файле значение выбранного раздела, файл
 * пересобирается на лету, и переход по ссылке сразу встаёт в новую точку.
 * На собранном сайте обработчик отвечает 404 и ничего не пишет.
 */

const FILE = path.join(process.cwd(), "src/app/anchors.css");
const IDS = ["halls", "gallery", "reels", "manager", "packages", "price", "contact", "how", "where", "faq"];
const PHONE_BLOCK = "@media (max-width: 1023.98px)";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | { mode?: string; id?: string; px?: number; rem?: number }
    | null;
  const { mode, id, px, rem } = body ?? {};
  if (
    (mode !== "pc" && mode !== "phone") ||
    !id ||
    !IDS.includes(id) ||
    typeof px !== "number" ||
    !Number.isFinite(px) ||
    px < -500 ||
    px > 2000 ||
    typeof rem !== "number" ||
    !(rem > 0)
  ) {
    return Response.json({ error: "неверные данные" }, { status: 400 });
  }

  const css = await fs.readFile(FILE, "utf8");
  const split = css.indexOf(PHONE_BLOCK);
  if (split < 0) return Response.json({ error: "в файле нет блока телефона" }, { status: 500 });

  const inRem = +(px / rem).toFixed(3);
  const value = mode === "pc" ? `${inRem}rem` : `calc(${inRem}rem + env(safe-area-inset-top))`;
  const rule = new RegExp(`(#${id} \{ scroll-margin-top: )[^;]+(; \})`);

  const pcPart = css.slice(0, split);
  const phonePart = css.slice(split);
  const target = mode === "pc" ? pcPart : phonePart;
  if (!rule.test(target)) return Response.json({ error: `нет правила для #${id}` }, { status: 500 });
  const updated = target.replace(rule, `$1${value}$2`);

  await fs.writeFile(FILE, mode === "pc" ? updated + phonePart : pcPart + updated);
  return Response.json({ ok: true, value });
}
