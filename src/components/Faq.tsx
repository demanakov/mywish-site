"use client";

import { useEffect, useState } from "react";

/**
 * Кончик пламени на картинке Руби (faq/hero.webp, 774×1080) — доли размера.
 * По нему картинка ставится на телефоне так, чтобы пламя заходило в зазор
 * между «В» и «о» заголовка.
 */
const FLAME = { fx: 0.4186, fy: 0.0065, ratio: 1080 / 774 };

/**
 * Пропорции шапки на телефоне.
 *   rubi    — ширина Руби в долях ширины блока (и потолок в px). Середина
 *             между двумя крайностями: при ~95px Руби терялся, при ~180px
 *             под заголовком оставалась пустота;
 *   tip     — где по высоте первой строки стоит кончик пламени (доля буквы);
 *   minLeft — левее этого картинка не уходит, иначе обрезается ковёр;
 *   кегль   — в этих пределах, дальше растёт или мельчает уже неуместно.
 */
const FIT = { rubi: 0.35, maxRubi: 170, tip: 0.72, minLeft: 4, minFs: 30, maxFs: 64 };
const NARROW = "(max-width: 1023.98px)";
import SectionHeading from "./SectionHeading";
import { box, px } from "@/lib/px";

/**
 * Секция 11 «вопросы» — Figma 914:2021 … 914:2075.
 * Сцена: макет 9220…9918 → 8264 на странице.
 *
 * Аккордеон: открыт ровно один ответ, по умолчанию первый. Список выложен
 * потоком с зазором 8.7 — при таком зазоре позиции пунктов совпадают с
 * макетом до пикселя, но, в отличие от жёстких координат, список сам
 * подстраивается под длину ответа. Это важно: тексты ответов ещё не готовы.
 *
 * Блок вставлен в макет в масштабе 0.7565, поэтому кегли дробные.
 */

type Item = { q: string; a: string; list?: string[] };

const ITEMS: Item[] = [
  {
    q: "Мы точно поместимся?",
    a: "Да, у нас девять залов на разное количество гостей — от 10 до 40 человек. Скажи, сколько вас будет, и менеджер подберёт подходящий.",
  },
  {
    q: "Можно со своей едой и напитками?",
    a: "Да, можно. В каждом пакете уже есть депозит на еду, но что-то докупить или принести своё тоже не проблема.",
  },
  {
    q: "Есть ли пробковый сбор?",
    a: "Нет. Ни в каком виде.",
  },
  {
    q: "Можно добавить ведущего, декор или что-то ещё?",
    a: "Да. Дополнительная еда, паровые коктейли, декор, шоу-программа — соберём что угодно под твой формат. Менеджер расскажет подробнее и посчитает.",
  },
  {
    q: "Как забронировать дату?",
    a: "Напиши нам — менеджер проверит, свободен ли зал в нужную дату, обсудит детали и посчитает итоговую сумму. После этого закрепим дату за тобой: для брони нужна предоплата от 50%.",
  },
  {
    q: "Можно ли продлить праздник в моменте?",
    a: "Можно, если после вас в зале нет другого праздника. Но лучше заложить время с запасом: все думают, что четырёх часов хватит, а в среднем празднуют шесть — время летит незаметно.",
  },
  {
    q: "Можно ли приехать посмотреть зал заранее?",
    a: "Конечно. Приезжай, посмотри зал вживую и обсуди детали с менеджером — договоримся об удобном времени.",
  },
  {
    q: "Что делать, если нужно отменить или перенести?",
    a: "Перенести можно в любой момент, кроме дня праздника. С отменой так:",
    list: [
      "больше 14 дней — вернём предоплату полностью",
      "7–14 дней — вернём половину или сохраним всю сумму, и ты потратишь её на праздник в течение года",
      "1–6 дней — сумма сохранится за тобой на год",
    ],
  },
];

const ROW_HEIGHT = 67;
/** Зазор между пунктами: с ним координаты совпадают с макетом. */
const GAP = 8.7;

export default function Faq() {
  const [open, setOpen] = useState(0);

  /*
    Телефон: шапка — одна композиция. Заголовок справа, Руби под ним слева,
    и пламя свечи заходит между «В» и «о» первой строки. Где эти буквы,
    знает только браузер, поэтому меряем их и ставим картинку по кончику
    пламени; подпись опускаем к низу картинки, список — под картинку.
    Считаем от раскладки (offsetLeft/offsetTop), а не от экрана: заголовок
    может въезжать анимацией появления.
  */
  useEffect(() => {
    const section = document.getElementById("faq");
    const heading = section?.querySelector<HTMLElement>(":scope > h2");
    const img = section?.querySelector<HTMLImageElement>(":scope > img");
    const lede = section?.querySelector<HTMLElement>(":scope > p");
    if (!section || !heading || !img || !lede) return;
    const media = window.matchMedia(NARROW);
    const props = [
      "--rubi-x",
      "--rubi-y",
      "--rubi-w",
      "--faq-fs",
      "--faq-lede-gap",
      "--faq-list-gap",
      "--faq-lede-fs",
    ];

    /** Первая строка заголовка: диапазон символов [from, to). */
    const range = (from: number, to?: number) => {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
      });
      const node = walker.nextNode();
      if (!node?.textContent) return null;
      const text = node.textContent;
      const start = text.search(/\S/);
      const end = start + text.trim().length;
      const r = document.createRange();
      r.setStart(node, start + from);
      r.setEnd(node, to === undefined ? start + from + 1 : Math.min(end, start + to));
      return r.getBoundingClientRect();
    };

    let frame = 0;

    const place = () => {
      if (!media.matches) {
        props.forEach((p) => section.style.removeProperty(p));
        return;
      }
      const v = range(0);
      const o = range(1);
      const line = range(0, Infinity);
      if (!v || !o || !line) return;
      const own = heading.getBoundingClientRect();
      const fs0 = parseFloat(getComputedStyle(heading).fontSize);

      /*
        Кегль под заданного Руби. Размеры строки пропорциональны кеглю —
        меряем доли при текущем:
          ширина первой строки          k·fs (строка прижата к правому краю);
          середина «В|о» от её начала   c·fs;
        левый край картинки = зазор − fx·ширина_Руби ≥ minLeft. Берём
        наибольший кегль, при котором это выполняется.
      */
      const k = line.width / fs0;
      const c = ((v.right + o.left) / 2 - line.left) / fs0;
      const cs = getComputedStyle(section);
      const right = section.clientWidth - parseFloat(cs.paddingRight);
      const rubiW = Math.min(FIT.maxRubi, section.clientWidth * FIT.rubi);
      const fs = Math.max(
        FIT.minFs,
        Math.min(FIT.maxFs, (right - FIT.minLeft - FLAME.fx * rubiW) / (k - c)),
      );
      const next = `${fs.toFixed(1)}px`;
      if (section.style.getPropertyValue("--faq-fs") !== next) {
        section.style.setProperty("--faq-fs", next);
        section.style.setProperty("--rubi-w", `${rubiW.toFixed(1)}px`);
        /* Кегль поменялся — буквы переехали: ставим картинку в следующем кадре. */
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(place);
        return;
      }

      const gapX = heading.offsetLeft + ((v.right + o.left) / 2 - own.left);
      /* 0.72 высоты буквы — пламя видно в зазоре, а не прячется за буквами. */
      const tipY = heading.offsetTop + (v.top - own.top) + v.height * FIT.tip;
      const w = img.offsetWidth;
      const h = w * FLAME.ratio;
      const x = gapX - FLAME.fx * w;
      const y = tipY - FLAME.fy * h;
      section.style.setProperty("--rubi-x", `${x.toFixed(1)}px`);
      section.style.setProperty("--rubi-y", `${y.toFixed(1)}px`);

      /*
        Подпись — низом ровно по низу ковра (0.954 высоты картинки): она
        держит композицию, выравнивая текстовую сторону с картинкой.
        Список — под картинку.
      */
      const headingBottom = heading.offsetTop + heading.offsetHeight;
      const imgBottom = y + h;
      const rugBottom = y + h * 0.954;
      /*
        На самых узких экранах строка подписи справа от ковра не помещается
        и наезжает на него — тогда подпись чуть мельче, но не меньше 10px.
      */
      section.style.removeProperty("--faq-lede-fs");
      const room = section.clientWidth - (x + w) - 6;
      if (lede.offsetWidth > room) {
        const base = parseFloat(getComputedStyle(lede).fontSize);
        const fit = Math.max(10, (base * room) / lede.offsetWidth);
        section.style.setProperty("--faq-lede-fs", `${fit.toFixed(2)}px`);
      }
      const ledeGap = Math.max(8, rugBottom - lede.offsetHeight - headingBottom);
      const ledeBottom = headingBottom + ledeGap + lede.offsetHeight;
      const listGap = Math.max(16, imgBottom + 16 - ledeBottom);
      section.style.setProperty("--faq-lede-gap", `${ledeGap.toFixed(1)}px`);
      section.style.setProperty("--faq-list-gap", `${listGap.toFixed(1)}px`);
    };

    place();
    document.fonts?.ready.then(place);
    const observer = new ResizeObserver(place);
    observer.observe(heading);
    observer.observe(img);
    media.addEventListener("change", place);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener("change", place);
      window.removeEventListener("resize", place);
    };
  }, []);

  return (
    <section id="faq" data-section="faq" style={box(0, 8264, 1440, 698)}>
      <SectionHeading
        size="m"
        node="914:2022"
        at={[130, 1, 464, 135]}
        accent="до праздника"
        className="text-left"
      >
        Вопросы, которые
        <br />
        лучше решить
      </SectionHeading>

      <p
        className="font-sans text-ink-muted"
        data-node-id="914:2023"
        style={{ ...box(130, 153, 249, 18), fontSize: px(11.4) }}
      >
        Собрали то, о чём спрашивают чаще всего.
      </p>

      {/* Иллюстрация 914:2082 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/faq/hero.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="max-w-none"
        style={box(127, 179, 387, 540)}
      />

      <div
        style={{
          ...box(642, 0, 668),
          display: "flex",
          flexDirection: "column",
          gap: px(GAP),
        }}
      >
        {ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            /*
              <details> всегда открыт: закрытый элемент браузер прячет сразу,
              без возможности анимировать высоту. Открыт ли ответ, решает
              data-open — по нему ответ плавно раскрывается (.u-faq-panel).
            */
            <details
              key={item.q}
              open
              data-node-id={i === 0 ? "914:2024" : undefined}
              className="u-faq group rounded-md"
              data-open={isOpen}
            >
              <summary
                aria-expanded={isOpen}
                className="relative flex cursor-pointer list-none"
                style={{ height: px(ROW_HEIGHT) }}
                onClick={(e) => {
                  /*
                    Открытым управляем сами: открыт не больше одного ответа.
                    Нажатие по открытому закрывает его — можно свернуть все.
                  */
                  e.preventDefault();
                  setOpen((current) => (current === i ? -1 : i));
                }}
              >
                <span
                  aria-hidden
                  className="font-sans font-bold text-primary"
                  style={{ ...box(19, 28, 20, 11), fontSize: px(7.6) }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="u-faq-question font-sans"
                  style={{
                    ...box(60, 21, 540, 24),
                    fontSize: px(21.2),
                    lineHeight: px(24),
                    letterSpacing: px(-0.53),
                  }}
                >
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className="u-faq-mark flex items-center justify-center rounded-pill"
                  style={{ ...box(623, 20, 26, 26), borderWidth: px(0.8) }}
                >
                  <svg
                    viewBox="0 0 12 12"
                    style={{ width: px(9), height: px(9) }}
                    aria-hidden
                  >
                    <path
                      d="M1 6h10"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6 1v10"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      className="u-faq-plus"
                    />
                  </svg>
                </span>
              </summary>

              <div className="u-faq-panel" inert={!isOpen}>
              <div className="u-faq-clip">
              <div
                className="u-faq-body rounded-sm bg-surface-alt"
                style={{
                  marginLeft: px(60),
                  marginRight: px(19),
                  marginBottom: px(19),
                  padding: `${px(18)} ${px(20)}`,
                }}
              >
                <p
                  className="font-sans text-ink-secondary"
                  style={{ fontSize: px(14), lineHeight: px(20.5) }}
                >
                  {item.a}
                </p>
                {item.list ? (
                  <ul
                    className="font-sans text-ink-secondary"
                    style={{
                      marginTop: px(8),
                      fontSize: px(14),
                      lineHeight: px(20.5),
                    }}
                  >
                    {item.list.map((line) => (
                      <li
                        key={line}
                        style={{ position: "relative", paddingLeft: px(14) }}
                      >
                        <span
                          aria-hidden
                          style={{ position: "absolute", left: 0 }}
                        >
                          ·
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
