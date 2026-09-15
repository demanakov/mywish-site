"use client";
import { parseKey, useCalendar } from "@/lib/calendar";

import { useEffect, useState, type CSSProperties } from "react";
import {
  pickDate,
  pickHours,
  pickPackage,
  setReturnTo,
  useOrder,
} from "@/lib/order";
import { HALLS } from "@/lib/halls.mjs";
import {
  HOURS,
  MONTHS,
  MONTHS_OF,
  PACKAGES,
  dateKey,
  getPackage,
  money,
  rentOfTier,
  rentPerHourOf,
  rentTierOf,
  rentTiersOfMonth,
  totalOf,
  weekdayOf,
  type PackageId,
} from "@/lib/pricing";
import { useSwipe } from "@/lib/useSwipe";

/**
 * «Выбери дату праздника» на телефоне и планшете (ниже 1024).
 *
 * Десктопная раскладка — три карточки по координатам макета, в ячейках
 * календаря цены, легенда в одну строку на 591px. В ширину телефона это
 * превращалось в плотную сетку мелких цифр, а легенда рвалась на две строки.
 * Здесь тот же расчёт (общий заказ из order.ts), но по привычным для телефона
 * образцам — календарь бронирования, степпер, итог с кнопкой:
 *
 *   календарь  — в ячейке только число; тариф дня читается цветом ячейки,
 *                сама цена — в плашках под сеткой, и плашка тарифа выбранной
 *                даты подсвечена: видно, какая ставка считается. Месяц
 *                листается стрелками и свайпом по сетке;
 *   пакет/часы — одна карточка: слева три пакета, справа степпер часов;
 *   итог       — сумма, из чего она сложилась, и следующий шаг — заявка.
 */

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_AHEAD = 12;
const WEEKDAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

/** Группа тарифа по дню недели: 0 — пн–чт, 1 — пт и вс, 2 — сб. */
const groupOf = (weekday: number) =>
  weekday === 5 ? 2 : weekday === 4 || weekday === 6 ? 1 : 0;

const GROUPS = [
  { label: "Пн–Чт", key: "weekday" },
  { label: "Пт, Вс", key: "weekend" },
  { label: "Сб", key: "saturday" },
] as const;

/** Цвет точки пакета — как у пилюль и карточек пакетов. */
const PACKAGE_DOT: Record<PackageId, string> = {
  happy: "var(--color-blush)",
  extra: "var(--color-primary)",
  wow: "var(--color-navy)",
};



/** Короткая декабрьская подпись периода: «1–11 декабря» → «1–11 дек». */
const shortTier = (label: string) => label.replace("декабря", "дек");

export default function DatePriceMobile() {
  const order = useOrder();
  const { today, monthOffset, setMonthOffset } = useCalendar();
  /** Куда листали: от этого — с какой стороны заезжает новый месяц. */
  const [dir, setDir] = useState<"next" | "prev">("next");


  const goMonth = (delta: number) => {
    const next = Math.max(0, Math.min(MONTHS_AHEAD - 1, monthOffset + delta));
    if (next === monthOffset) return;
    setDir(delta > 0 ? "next" : "prev");
    setMonthOffset(next);
  };
  const swipe = useSwipe(goMonth);

  const anchor = today ?? new Date();
  const shown = new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1);
  const firstWeekday = weekdayOf(shown);
  const daysInMonth = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
  const tiers = rentTiersOfMonth(shown.getFullYear(), shown.getMonth());

  const selected = order.date ? parseKey(order.date) : null;
  /*
    Подсветка плашки тарифа — только если выбранная дата в показанном месяце:
    листая дальше, человек смотрит цены другого месяца, и подсвеченная ставка
    чужой даты сбивала бы с толку.
  */
  const selectedHere =
    selected !== null &&
    selected.getFullYear() === shown.getFullYear() &&
    selected.getMonth() === shown.getMonth();
  const selectedTier = selectedHere && selected ? rentTierOf(selected) : null;
  const selectedGroup =
    selectedHere && selected ? groupOf(weekdayOf(selected)) : -1;

  const pkg = getPackage(order.pkg);
  const hall = HALLS.find((h) => h.title === order.hall) ?? null;
  const rentPerHour = selected ? rentPerHourOf(selected) : 0;
  const rent = rentPerHour * order.hours;
  const total = totalOf(order.pkg, order.hours, selected);

  const hoursIndex = HOURS.indexOf(order.hours);
  const setHours = (delta: number) => {
    const next = HOURS[hoursIndex + delta];
    if (next !== undefined) pickHours(next);
  };

  return (
    <div className="dp-mobile">
      {/* ── Календарь ───────────────────────────────────────────── */}
      <div className="dp-card dp-calendar">
        <div className="dp-month">
          <button
            type="button"
            className="dp-round"
            aria-label="Предыдущий месяц"
            disabled={monthOffset === 0}
            onClick={() => goMonth(-1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden fill="none">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="dp-month-title" aria-live="polite">
            {today ? `${MONTHS[shown.getMonth()]} ${shown.getFullYear()}` : " "}
          </p>
          <button
            type="button"
            className="dp-round"
            aria-label="Следующий месяц"
            disabled={monthOffset >= MONTHS_AHEAD - 1}
            onClick={() => goMonth(1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden fill="none">
              <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="dp-weekdays" aria-hidden>
          {WEEKDAYS.map((d, i) => (
            <span key={d} data-weekend={i >= 5}>
              {d}
            </span>
          ))}
        </div>

        {/* Свайп по сетке — соседний месяц; key — чтобы новый месяц заехал. */}
        <div
          key={`${shown.getFullYear()}-${shown.getMonth()}`}
          className="dp-grid"
          data-dir={dir}
          {...swipe}
        >
          {today
            ? Array.from({ length: firstWeekday + daysInMonth }, (_, i) => {
                const day = i - firstWeekday + 1;
                if (day < 1) return <span key={`empty-${i}`} />;
                const date = new Date(shown.getFullYear(), shown.getMonth(), day);
                const key = dateKey(date);
                const past = date < today;
                const isToday = date.getTime() === today.getTime();
                const isSelected = order.date === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className="dp-day"
                    data-group={groupOf(weekdayOf(date))}
                    data-past={past || undefined}
                    data-today={isToday || undefined}
                    aria-pressed={isSelected}
                    disabled={past}
                    aria-label={`${day} ${MONTHS_OF[shown.getMonth()]}, ${money(rentPerHourOf(date))} в час`}
                    onClick={() => pickDate(key)}
                  >
                    {day}
                  </button>
                );
              })
            : null}
        </div>

        {/*
          Тарифы — плашками в строку: цвет плашки тот же, что у ячеек этой
          группы. Плашка тарифа выбранной даты подсвечена. В декабре две
          строки, по периоду.
        */}
        <div className="dp-tiers">
          {tiers.map((tier) => (
            <div key={tier.label} className="dp-tier-row">
              {tiers.length > 1 ? (
                <span className="dp-tier-period">{shortTier(tier.label)}</span>
              ) : null}
              {GROUPS.map((g, gi) => (
                <span
                  key={g.key}
                  className="dp-tier"
                  data-group={gi}
                  data-on={
                    selectedTier?.label === tier.label && selectedGroup === gi
                  }
                >
                  <b>{g.label}</b> {money(rentOfTier(tier, gi === 2 ? 5 : gi === 1 ? 4 : 0))}/ч
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Пакет и часы ────────────────────────────────────────── */}
      <div className="dp-card dp-options">
        <div className="dp-col">
          <p className="dp-label">
            Пакет
            {!order.pkgTouched ? <span className="dp-ours">наш выбор</span> : null}
          </p>
          <div className="dp-packages" role="group" aria-label="Пакет">
            {PACKAGES.map((p) => {
              const on = order.pkg === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className="dp-package"
                  aria-pressed={on}
                  data-firm={on && order.pkgTouched}
                  onClick={() => pickPackage(p.id)}
                  style={{ "--dot": PACKAGE_DOT[p.id] } as CSSProperties}
                >
                  <i aria-hidden />
                  <span className="dp-package-name">{p.short}</span>
                  <span className="dp-package-price">{money(p.price)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="dp-col dp-hours">
          <p className="dp-label">
            Часы
            {!order.hoursTouched ? <span className="dp-ours">наш выбор</span> : null}
          </p>
          <p className="dp-hours-value" aria-live="polite">
            <b key={order.hours}>{order.hours}</b> ч
          </p>
          <div className="dp-stepper">
            <button
              type="button"
              className="dp-round"
              aria-label="Меньше часов"
              disabled={hoursIndex <= 0}
              onClick={() => setHours(-1)}
            >
              <svg viewBox="0 0 16 16" aria-hidden fill="none">
                <path d="M3.5 8h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className="dp-round"
              aria-label="Больше часов"
              disabled={hoursIndex >= HOURS.length - 1}
              onClick={() => setHours(1)}
            >
              <svg viewBox="0 0 16 16" aria-hidden fill="none">
                <path d="M3.5 8h9M8 3.5v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p className="dp-hours-note">
            от {HOURS[0]} до {HOURS[HOURS.length - 1]} ч
          </p>
        </div>
      </div>

      {/* ── Итог ────────────────────────────────────────────────── */}
      <div id="dp-total" className="dp-total">
        <p className="dp-total-label">Итого за праздник</p>
        <p className="dp-total-sum" aria-live="polite">
          <span key={total}>{money(total)}</span>
        </p>

        <dl className="dp-lines">
          <div>
            <dt>Пакет {pkg.title}</dt>
            <dd>{money(pkg.price)}</dd>
          </div>
          <div>
            <dt>
              {selected
                ? `Аренда · ${WEEKDAYS_SHORT[weekdayOf(selected)]}, ${selected.getDate()} ${MONTHS_OF[selected.getMonth()]}`
                : "Аренда"}
              {selected ? (
                <small>
                  {order.hours} ч × {money(rentPerHour)}
                </small>
              ) : null}
            </dt>
            <dd>{selected ? money(rent) : "выбери дату"}</dd>
          </div>
          <div>
            <dt>Зал</dt>
            <dd>
              {hall ? (
                `«${hall.title}»`
              ) : (
                /*
                  Уходим к залам — запоминаем, откуда: выбрав зал, человек
                  вернётся сюда сам (см. returnAfterHallPick в order.ts).
                */
                <a
                  href="#halls"
                  className="dp-link"
                  onClick={() => setReturnTo("dp-total")}
                >
                  выбрать
                </a>
              )}
            </dd>
          </div>
        </dl>

        <a href="#contact" className="u-cta dp-cta">
          ОСТАВИТЬ ЗАЯВКУ
        </a>
        <p className="dp-note">Менеджер подтвердит свободное время и сумму</p>
      </div>
    </div>
  );
}
