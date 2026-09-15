// Проверка мобильной раскладки: снимки и поиск вылезающих за экран элементов.
// node scripts/mobile.mjs [ширины через запятую]   (по умолчанию 375,390,768)
// Снимки: docs/shots/mobile/<ширина>-full.png и <ширина>-<секция>.png
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const WIDTHS = (process.argv[2] ?? "375,390,768").split(",").map(Number);
const OUT = "docs/shots/mobile";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const w of WIDTHS) {
  const page = await browser.newPage({
    viewport: { width: w, height: 812 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 100)));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url().split("/").pop()}`));
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  // прокрутка: ленивые картинки и появление блоков
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.addStyleTag({ content: "[data-reveal]{opacity:1!important;animation:none!important}" });
  await page.waitForTimeout(800);

  const report = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (el.closest(".decor-layer, dialog, .u-visually-hidden, .halls-fan")) continue;
      // ленты со свайпом: содержимое за краем прокручивается, это не ошибка
      let scroller = el.parentElement;
      while (scroller && getComputedStyle(scroller).overflowX === "visible") scroller = scroller.parentElement;
      if (scroller && scroller !== document.body && scroller !== document.documentElement) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const section = el.closest("[data-section]")?.getAttribute("data-section") ?? "—";
        offenders.push(
          `${section} · <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 40)}"> ` +
            `${Math.round(r.left)}…${Math.round(r.right)}`,
        );
      }
    }
    const sections = [...document.querySelectorAll("[data-section], .u-cta-band, footer")].map((s) => {
      const r = s.getBoundingClientRect();
      const id = s.getAttribute("data-section") ?? (s.tagName === "FOOTER" ? "footer" : "cta");
      return { id, y: Math.round(r.top + scrollY), h: Math.round(r.height) };
    });
    return {
      docW: document.documentElement.scrollWidth,
      vw,
      pageH: document.body.scrollHeight,
      offenders,
      sections,
    };
  });

  const hScroll = report.docW > report.vw + 1;
  console.log(
    `\n${w}px | высота ${report.pageH} | гор. скролл: ${hScroll ? `ЕСТЬ (${report.docW - report.vw}px)` : "нет"}` +
      (errors.length ? ` | ошибки: ${errors.slice(0, 3).join(", ")}` : ""),
  );
  console.log("секции:", report.sections.map((s) => `${s.id} ${s.h}`).join(" · "));
  if (report.offenders.length) {
    console.log(`вылезают за экран (${report.offenders.length}):`);
    report.offenders.slice(0, 25).forEach((o) => console.log("  " + o));
  }

  await page.screenshot({ path: `${OUT}/${w}-full.png`, fullPage: true });
  for (const s of report.sections) {
    if (!s.h) continue;
    await page.screenshot({
      path: `${OUT}/${w}-${s.id}.png`,
      fullPage: true,
      clip: { x: 0, y: s.y, width: w, height: Math.min(s.h, 4000) },
    });
  }
  await page.close();
}
await browser.close();
