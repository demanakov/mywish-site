"use client";
import { parseKey, useCalendar } from "@/lib/calendar";

import { useEffect, useState } from "react";
import SectionHeading from "./SectionHeading";
import StepDone from "./StepDone";
import DatePriceMobile from "./DatePriceMobile";
import { box, px } from "@/lib/px";
import { pickDate, pickHours, pickPackage, useOrder } from "@/lib/order";
import { HALLS } from "@/lib/halls.mjs";
import {
  HOURS,
  MONTHS,
  MONTHS_OF,
  PACKAGES,
  rentPerHourOf,
  rentTiersOfMonth,
  totalOf,
  dateKey,
  getPackage,
  money,
  weekdayOf,
} from "@/lib/pricing";

/**
 * Секция 7 «выбери дату праздника» — Figma 914:1556 … 914:1799.
 * Сцена: макет 5890…6804 → 4934 на странице.
 *
 * Блок вставлен в макет в масштабе 0.7619, поэтому внутри дробные кегли
 * (12.95 / 9.14 / 7.62) — оставлены как в макете.
 *
 * Календарь считает от сегодняшнего дня и листается на год вперёд. «Сегодня»
 * берётся не при отрисовке, а после гидрации: страница собирается заранее, и
 * дата сборки давно не была бы сегодняшней. До этого момента сетка дней
 * держит размер, но пустая — это один кадр.
 */

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_AHEAD = 12;

/*
  Календарь строится от числа недель в месяце: сетка, легенда под ней и низ
  карточки едут вверх, если месяц уложился в пять недель. Размеры взяты из
  макета (914:1564): ячейка 62, зазор 4, сетка начинается на 79, между сеткой
  и легендой 15, снизу поле 18. На шести неделях всё сходится с макетом
  до пикселя — 392 сетка, легенда на 486, карточка 531.
*/
const CELL = 62;
const GAP = 4;
const GRID_TOP = 79;
const LEGEND_GAP = 15;
const LEGEND_H = 27;
/** Высота дополнительной строки легенды — её добавляет второй период в декабре. */
const LEGEND_ROW = 18;
const PAD = 18;

const gridHeight = (rows: number) => rows * CELL + (rows - 1) * GAP;

/** Плашка у заголовка карточки: пока выбор не сделан — он наш, а не человека. */
function OurPick({ shown }: { shown: boolean }) {
  return (
    <span
      className="u-hint"
      aria-hidden={!shown}
      style={{
        position: "absolute",
        right: px(18),
        top: px(19),
        padding: `${px(1)} ${px(8)}`,
        fontSize: px(9.9),
        lineHeight: px(15),
      }}
    >
      наш выбор
    </span>
  );
}



/**
 * Вид ячейки календаря — как в макете: прошедшие дни без подложки, будни
 * белые с обводкой, пятница и воскресенье светло-розовые, суббота розовая,
 * выбранный день красный.
 */
function dayStyle(past: boolean, selected: boolean, weekday: number) {
  if (past)
    return {
      bg: "transparent",
      border: "transparent",
      num: "rgba(16,16,16,0.3)",
      price: "rgba(16,16,16,0.3)",
    };
  if (selected)
    return {
      bg: "var(--color-primary)",
      border: "transparent",
      num: "#FFFFFF",
      price: "#FFFFFF",
    };
  if (weekday === 5)
    return {
      bg: "var(--color-blush)",
      border: "transparent",
      num: "#000000",
      price: "var(--color-ink)",
    };
  if (weekday === 4 || weekday === 6)
    return {
      bg: "var(--color-surface-alt)",
      border: "transparent",
      num: "#000000",
      price: "var(--color-ink)",
    };
  return {
    bg: "var(--color-surface)",
    border: "var(--color-border-soft)",
    num: "#000000",
    price: "var(--color-muted)",
  };
}

/** Дни недели для подсказки — полностью, от понедельника. */
const WEEKDAYS_FULL = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

export default function DatePrice() {
  const order = useOrder();
  /* Дата под курсором: по ней живёт подсказка под заголовком. */
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const { today, monthOffset, setMonthOffset } = useCalendar();


  const anchor = today ?? new Date();
  const shown = new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1);
  const firstWeekday = weekdayOf(shown);
  const daysInMonth = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();

  // до гидрации месяц неизвестен — держим максимум, чтобы карточка не росла
  const rows = today ? Math.ceil((firstWeekday + daysInMonth) / 7) : 6;
  const gridH = gridHeight(rows);
  const legendTop = GRID_TOP + gridH + LEGEND_GAP;
  /*
    Периодов в месяце обычно один, в декабре два — легенда и вслед за ней низ
    карточки на декабре подрастают на строку. Карточка и так меняет высоту
    между пяти- и шестинедельными месяцами, так что это то же самое поведение.
  */
  const tiers = rentTiersOfMonth(shown.getFullYear(), shown.getMonth());
  const legendH = LEGEND_H + (tiers.length - 1) * LEGEND_ROW;
  const cardH = legendTop + legendH + PAD;

  const selected = order.date ? parseKey(order.date) : null;
  const pkg = getPackage(order.pkg);
  const hall = HALLS.find((h) => h.title === order.hall) ?? null;
  const rentPerHour = selected ? rentPerHourOf(selected) : 0;
  const rent = rentPerHour * order.hours;
  const total = totalOf(order.pkg, order.hours, selected);

  /*
    Текст подсказки. Три случая: курсор ни на чём, курсор на прошедшем дне,
    курсор на доступном. У прошедшего цену не показываем — она ничего не
    значит, важна только причина, по которой день не берётся.
  */
  const hoverDate = hoverKey ? parseKey(hoverKey) : null;
  let hint = "Стоимость аренды зависит от дня недели. Бронируем от 4 часов.";
  if (hoverDate && today && hoverDate < today) {
    hint =
      hoverDate.getDate() +
      " " +
      MONTHS_OF[hoverDate.getMonth()] +
      " уже прошло";
  } else if (hoverDate) {
    const час = rentPerHourOf(hoverDate);
    hint =
      hoverDate.getDate() +
      " " +
      MONTHS_OF[hoverDate.getMonth()] +
      ", " +
      WEEKDAYS_FULL[weekdayOf(hoverDate)].toLowerCase() +
      " · " +
      money(час) +
      "/час · " +
      order.hours +
      " ч — " +
      money(час * order.hours) +
      (hoverKey === order.date ? " — выбрана" : "");
  }

  return (
    <section
      id="price"
      data-section="price"
      data-step="date"
      className="u-snap"
      /* Коробка подрезана до содержимого — см. Packages.tsx. */
      style={box(0, 4934, 1440, 860)}
    >
      <SectionHeading
        node="914:1559"
        at={[512, 25, 429, 140]}
        accent="праздника"
      >
        Выбери дату
      </SectionHeading>

      {/* Стикер над заголовком — image 86 (914:1560) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/price/heading-sticker.webp"
        alt=""
        aria-hidden
        className="u-step-sticker max-w-none"
        style={{ ...box(486, 4, 44, 41), transform: "rotate(-11.91deg)" }}
      />

      {/* Галочка выполненного шага — на месте стикера, см. StepDone. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/steps/done.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="u-step-check max-w-none"
        style={{ ...box(486, 4, 44, 41), transform: "rotate(-11.91deg)" }}
      />
      <StepDone step="date" at={[486, 4, 44, 41]} />

      {/*
        Подсказка под заголовком — как у залов и пакетов. В покое объясняет
        правило: про декабрь здесь намеренно молчим, кто на него метит, увидит
        цену в самой ячейке. Под курсором считает за человека то, что он и так
        считает глазами: цена часа, часы, итог за аренду.
      */}
      <p
        className="u-lede u-step-hint"
        data-node-id="914:1561"
        data-active={Boolean(hoverKey)}
        style={box(220, 188, 1000, 28)}
      >
        {hint}
      </p>

      {/* ── Календарь 914:1564 ─────────────────────────────────── */}
      <div
        data-node-id="914:1564"
        className="rounded-md bg-surface"
        style={{ ...box(578, 234, 591, cardH), boxShadow: "var(--shadow-soft)" }}
      >
        {/* Шапка месяца 914:1565 */}
        <div
          className="flex items-center justify-between"
          style={box(18, 18, 555, 29)}
        >
          <button
            type="button"
            aria-label="Предыдущий месяц"
            disabled={monthOffset === 0}
            onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
            /* --nudge: в какую сторону дёрнуть стрелку под курсором. */
            style={{ "--nudge": "-0.125rem" } as React.CSSProperties}
            className="u-month flex size-29 items-center justify-center rounded-pill border"
          >
            <svg viewBox="0 0 8 12" className="h-11 w-7" aria-hidden fill="none">
              <path
                d="M7 1 1.5 6 7 11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span
            className="font-display font-bold text-ink"
            style={{ fontSize: px(21.3), lineHeight: px(26) }}
          >
            {today ? `${MONTHS[shown.getMonth()]} ${shown.getFullYear()}` : ""}
          </span>
          <button
            type="button"
            aria-label="Следующий месяц"
            disabled={monthOffset >= MONTHS_AHEAD - 1}
            onClick={() =>
              setMonthOffset((m) => Math.min(MONTHS_AHEAD - 1, m + 1))
            }
            style={{ "--nudge": "0.125rem" } as React.CSSProperties}
            className="u-month flex size-29 items-center justify-center rounded-pill border"
          >
            <svg viewBox="0 0 8 12" className="h-11 w-7" aria-hidden fill="none">
              <path
                d="M1 1 6.5 6 1 11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Дни недели 914:1572 */}
        <div
          className="grid grid-cols-7 text-center"
          style={{ ...box(18, 53, 555, 20), columnGap: px(4) }}
        >
          {WEEKDAYS.map((d) => (
            <span
              key={d}
              className="font-sans font-semibold text-ink-muted"
              style={{ fontSize: px(9.1) }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Сетка дней 914:1587 */}
        <div
          className="grid grid-cols-7"
          style={{
            ...box(18, GRID_TOP, 555, gridH),
            gridTemplateRows: `repeat(${rows}, ${px(CELL)})`,
            columnGap: px(GAP),
            rowGap: px(GAP),
          }}
        >
          {today
            ? Array.from({ length: firstWeekday + daysInMonth }, (_, i) => {
                const day = i - firstWeekday + 1;
                if (day < 1) return <span key={`empty-${i}`} />;

                const date = new Date(shown.getFullYear(), shown.getMonth(), day);
                const key = dateKey(date);
                const weekday = weekdayOf(date);
                const past = date < today;
                const isSelected = order.date === key;
                const s = dayStyle(past, isSelected, weekday);

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={past}
                    aria-pressed={isSelected}
                    aria-label={`${day} ${MONTHS_OF[shown.getMonth()]} ${shown.getFullYear()}`}
                    onClick={() => pickDate(key)}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== "touch") setHoverKey(key);
                    }}
                    onPointerLeave={() => setHoverKey(null)}
                    onFocus={() => setHoverKey(key)}
                    onBlur={() => setHoverKey(null)}
                    className="u-day flex flex-col items-center rounded-sm"
                    /*
                      Цвета ячейки уходят переменными, а не готовыми
                      свойствами. Инлайн-стиль сильнее любого правила, и пока
                      фон с обводкой стояли здесь напрямую, подсветка на
                      наведении до них не доставала: под курсором менялись
                      только подъём и тень.
                    */
                    style={
                      {
                        paddingTop: px(20),
                        "--day-bg": s.bg,
                        "--day-border": s.border,
                        "--day-num": s.num,
                        "--day-price": s.price,
                        cursor: past ? "default" : "pointer",
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className="u-day-num font-sans font-bold"
                      style={{
                        fontSize: px(12.95),
                        lineHeight: px(12.95),
                      }}
                    >
                      {day}
                    </span>
                    <span
                      className="u-day-price font-sans font-medium"
                      style={{
                        fontSize: px(7.6),
                        lineHeight: px(7.6),
                        marginTop: px(7),
                      }}
                    >
                      {money(rentPerHourOf(date))}
                    </span>
                  </button>
                );
              })
            : null}
        </div>

        {/*
          Легенда 914:1743. В макете это одна строка с тремя ценами: тариф
          зависел только от дня недели и был одинаковым весь год. Теперь у
          декабря свой прайс, да ещё двумя периодами, поэтому легенда идёт по
          строке на период — иначе цены в ячейках после 11 декабря выглядели бы
          опечаткой. В обычном месяце период один, и строка снова одна, как в
          макете.
        */}
        <div
          className="flex flex-col"
          style={{ ...box(18, legendTop, 500, legendH), rowGap: px(4) }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.label}
              className="flex items-center"
              style={{ columnGap: px(15) }}
            >
              {tiers.length > 1 ? (
                <span
                  className="font-sans font-bold text-ink"
                  style={{
                    fontSize: px(9.9),
                    lineHeight: px(14),
                    minWidth: px(78),
                  }}
                >
                  {tier.label}
                </span>
              ) : null}
              {[
                {
                  t: `Пн–чт — ${money(tier.weekday)}/час`,
                  bg: "var(--color-surface)",
                  border: "var(--color-border-soft)",
                },
                {
                  t: `Пт и вс — ${money(tier.weekend)}/час`,
                  bg: "var(--color-surface-alt)",
                  border: "transparent",
                },
                {
                  t: `Суббота — ${money(tier.saturday)}/час`,
                  bg: "var(--color-blush)",
                  border: "transparent",
                },
              ].map((l) => (
                <span
                  key={l.t}
                  className="flex items-center whitespace-nowrap font-sans text-ink-muted"
                  style={{ fontSize: px(9.9), lineHeight: px(14) }}
                >
                  <span
                    aria-hidden
                    className="rounded-xs"
                    style={{
                      width: px(8),
                      height: px(8),
                      marginRight: px(5),
                      background: l.bg,
                      border: `${px(0.8)} solid ${l.border}`,
                    }}
                  />
                  {l.t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Карточка «Твой пакет» 914:1777 ─────────────────────── */}
      <div
        data-node-id="914:1777"
        className="rounded-md bg-surface"
        style={{ ...box(270, 308, 290, 209), boxShadow: "var(--shadow-soft)" }}
      >
        <p
          className="font-sans font-bold text-ink"
          style={{ ...box(18, 18, 253, 21), fontSize: px(11.4) }}
        >
          Твой пакет
        </p>
        <OurPick shown={!order.pkgTouched} />
        {PACKAGES.map((p, i) => {
          const on = order.pkg === p.id;
          // до первого клика выбор — это подсказка, а не решение за человека
          const firm = on && order.pkgTouched;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => pickPackage(p.id)}
              className={`u-option flex items-center rounded-sm border ${
                on
                  ? firm
                    ? "border-primary bg-surface-alt"
                    : "border-border-soft bg-surface-alt"
                  : "border-border-soft bg-surface"
              }`}
              style={{ ...box(18, 45 + i * 48, 253, 42), paddingInline: px(15) }}
            >
              <span
                aria-hidden
                className="flex shrink-0 items-center justify-center rounded-pill border"
                style={{
                  width: px(11),
                  height: px(11),
                  marginRight: px(9),
                  borderColor: on
                    ? firm
                      ? "var(--color-primary)"
                      : "var(--color-border-soft)"
                    : "var(--color-border-soft)",
                }}
              >
                {on ? (
                  <span
                    className="rounded-pill"
                    style={{
                      width: px(5),
                      height: px(5),
                      background: firm
                        ? "var(--color-primary)"
                        : "var(--color-ink-muted)",
                    }}
                  />
                ) : null}
              </span>
              <span
                className="font-sans font-bold text-ink"
                style={{ fontSize: px(13) }}
              >
                {p.short}
              </span>
              <span
                className="ml-auto font-sans font-bold text-ink"
                style={{ fontSize: px(12.2) }}
              >
                {money(p.price)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Карточка «Сколько часов» 914:1761 ──────────────────── */}
      <div
        data-node-id="914:1761"
        className="rounded-md bg-surface"
        style={{ ...box(270, 529, 290, 120), boxShadow: "var(--shadow-soft)" }}
      >
        <p
          className="font-sans font-bold text-ink"
          style={{ ...box(18, 18, 253, 16), fontSize: px(11.4) }}
        >
          Сколько часов планируешь?
        </p>
        <OurPick shown={!order.hoursTouched} />
        <div
          className="flex"
          style={{ ...box(18, 43, 253, 35), columnGap: px(11) }}
        >
          {HOURS.map((h) => {
            const on = order.hours === h;
            const firm = on && order.hoursTouched;
            return (
              <button
                key={h}
                type="button"
                aria-pressed={on}
                onClick={() => pickHours(h)}
                className={`u-option flex flex-1 items-center justify-center rounded-pill border font-sans font-bold ${
                  on
                    ? firm
                      ? "border-transparent bg-primary text-surface"
                      : "border-transparent bg-blush text-primary"
                    : "border-border-soft bg-surface text-ink"
                }`}
                style={{ fontSize: px(11.4) }}
              >
                {h} ч
              </button>
            );
          })}
        </div>
        <p
          className="font-sans text-ink-muted"
          style={{ ...box(18, 87, 253, 14), fontSize: px(9.9) }}
        >
          Бронируем от 4 часов.
        </p>
      </div>

      {/*
        ── Итого 914:1753 ───────────────────────────────────────
        Плашка поднята с 775 на 719: между ней и календарём стояли 76 px
        пустоты, из-за которых итог уходил за нижний край экрана, когда блок
        открывали по якорю. Внутри плашки ничего не поменялось.
      */}
      <div
        data-node-id="914:1753"
        className="rounded-md"
        style={{
          ...box(270, 719, 899, 107),
          background: "linear-gradient(90deg, #0E1736 0%, #28314C 100%)",
        }}
      >
        <p
          className="font-sans font-semibold text-surface"
          style={{ ...box(24, 28, 162, 14), fontSize: px(9.9) }}
        >
          Итого за праздник
        </p>
        <p
          className="font-display font-extrabold text-surface"
          style={{
            ...box(24, 45, 300, 43),
            fontSize: px(42.7),
            lineHeight: px(42.7),
          }}
        >
          {money(total)}
        </p>
{/*
          Расшифровка: зал, пакет, аренда — в том порядке, в каком их выбирают
          на странице. Зал попал сюда не для арифметики (на сумму он не влияет,
          все залы стоят одинаково), а потому что это такой же шаг заказа, как
          пакет и дата: без строки в итоге выбор во втором блоке выглядел
          украшением и терялся.

          Строк стало три вместо макетных двух, поэтому блок поднят на 9 и
          подрос на 17 — на одну строку. Правый край на месте: 875 от левого
          края плашки, то есть те же 24 отступа, что слева.

          Ширина 320, а не макетные 205. При выравнивании по правому краю
          строка, которая шире коробки, не переносится и не уходит влево —
          она вылезает вправо: декабрьская аренда доходила до 897 и упиралась
          в самый край плашки.

          Каждая строка целиком, без переносов: наш шрифт шире фигмовского и
          рвал бы их по словам.
        */}
        <p
          className="whitespace-nowrap text-right font-sans text-surface"
          style={{
            ...box(555, 31, 320, 52),
            fontSize: px(10.7),
            lineHeight: px(17),
          }}
        >
          {hall
            ? `Зал «${hall.title}» — ${hall.area} м²`
            : "Зал не выбран — подберём вместе"}
          <br />
          Пакет {pkg.title} — {money(pkg.price)}
          <br />
          {selected
            ? `Аренда ${selected.getDate()} ${MONTHS_OF[selected.getMonth()]} — ${money(rent)} (${money(rentPerHour)} × ${order.hours} ч)`
            : "Выбери дату — посчитаем аренду"}
        </p>
      </div>

      {/*
        914:1799 — одна строка по правому краю сетки (640…1169). Перенос
        запрещён: CSS добавляет трекинг после последней буквы, из-за чего
        строка не влезает в макетные 529 и рвётся на две.
      */}
      <p
        className="whitespace-nowrap text-right font-sans text-ink-muted"
        data-node-id="914:1799"
        style={{
          ...box(640, 817, 529, 41),
          fontSize: px(12),
          lineHeight: px(43.2),
        }}
      >
        Перед бронированием менеджер проверит свободное время и подтвердит
        итоговую сумму.
      </p>

      {/* Ниже 1024 — своя раскладка: календарь, пакет и часы, итог (mobile.css). */}
      <DatePriceMobile />
    </section>
  );
}
