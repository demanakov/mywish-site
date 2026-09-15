// Первый экран на телефоне: замеры по ТЗ и снимки.
// node scripts/hero-mobile.mjs            (сервер на :3000)
// Снимки: docs/shots/mobile/hero-<ширина>x<высота>.png
//
// Что проверяет на каждом размере:
//   • заголовок начинается ниже бокала Руи (52% высоты кадра);
//   • кегль и число строк заголовка и подзаголовка, зазор между ними;
//   • кнопки: высота, ряд или столбец, промежуток, отступ снизу;
//   • поля, кнопки шапки и логотип; какой фон загрузился.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const SIZES = [
  [375, 812],
  [390, 844],
  [430, 932],
  [340, 700], // уже 360 — кнопки столбцом
  [375, 667], // низкий экран — допускается небольшая прокрутка
];
const OUT = "docs/shots/mobile";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 90)));
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500); // печать заголовка и всплытие кнопок

  const m = await page.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const hero = document.querySelector("#hero");
    const h1 = document.querySelector("#hero h1");
    const lede = document.querySelector("#hero .hero-interface-layer p.mt-19");
    const img = document.querySelector("#hero .hero-mobile-photo img");
    const btns = [...document.querySelectorAll("#hero .hero-pop > .u-cta")].map(r);
    const lines = (el) => Math.round(r(el).height / parseFloat(getComputedStyle(el).lineHeight));
    const artH = r(img).height;
    const row = btns[0].top === btns[1].top;
    return {
      hero: Math.round(r(hero).height),
      glass: Math.round(artH * 0.52),
      h1Top: Math.round(r(h1).top),
      h1: `${parseFloat(getComputedStyle(h1).fontSize).toFixed(1)}px × ${lines(h1)} стр.`,
      lede: `${getComputedStyle(lede).fontSize} × ${lines(lede)} стр.`,
      gap: Math.round(r(lede).top - r(h1).bottom),
      field: Math.round(r(h1).left),
      btn: `${Math.round(btns[0].width)}×${Math.round(btns[0].height)}`,
      btns: row ? `ряд, зазор ${Math.round(btns[1].left - btns[0].right)}` : "столбец",
      bottom: Math.round(r(hero).bottom - Math.max(...btns.map((b) => b.bottom))),
      header: [...document.querySelectorAll(".m-header .m-round")]
        .map((b) => `${Math.round(r(b).left)}:${Math.round(r(b).width)}×${Math.round(r(b).height)}`)
        .join(" "),
      logo: Math.round(r(document.querySelector(".m-header-logo")).width),
      bg: img.currentSrc.split("/").pop(),
      hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  const ok = m.h1Top > m.glass ? "ok" : "ЗАГОЛОВОК НА БОКАЛЕ";
  console.log(
    `\n${w}×${h} [${ok}] hero ${m.hero} | заголовок с ${m.h1Top} (бокал до ${m.glass}) ${m.h1} | ` +
      `подзаголовок ${m.lede}, зазор ${m.gap} | поле ${m.field}\n` +
      `  кнопки ${m.btn}, ${m.btns}, снизу ${m.bottom} | шапка ${m.header}, логотип ${m.logo} | ` +
      `фон ${m.bg} | гор. скролл: ${m.hScroll ? "ЕСТЬ" : "нет"}` +
      (errors.length ? `\n  ошибки: ${errors.join(" | ")}` : ""),
  );
  await page.screenshot({ path: `${OUT}/hero-${w}x${h}.png` });
  await ctx.close();
}
await browser.close();
