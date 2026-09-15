"use client";

import { useEffect, useSyncExternalStore } from "react";
import { HOURS, type PackageId } from "./pricing";
import { HALL_TITLES } from "./halls.mjs";

/**
 * Черновик заказа, общий для всей страницы: кнопка «выбрать» в карточке пакета
 * и калькулятор ниже — это один и тот же выбор, поэтому состояние живёт вне
 * компонентов. Контекст здесь не нужен: обе точки — маленькие клиентские
 * острова внутри серверной страницы.
 *
 * touched отделяет «мы рекомендуем» от «человек выбрал»: до первого клика
 * пакет и длительность подсвечены мягко, после — в полную силу.
 */
export type Order = {
  pkg: PackageId;
  pkgTouched: boolean;
  hours: number;
  hoursTouched: boolean;
  /** Ключ даты вида «2026-09-08»; null, пока страница не ожила. */
  date: string | null;
  /** Дату поставил человек, а не подставили по умолчанию. */
  dateTouched: boolean;
  /** Название зала из формы; пустая строка — «помогите выбрать». */
  hall: string;
  sent: boolean;
  /**
   * Куда вернуть человека после выбора зала — id блока. Ставится, когда к
   * залам уходят из другого места страницы (ссылка «выбрать» в итоге
   * расчёта): выбрал зал — страница сама едет обратно, листать заново не надо.
   */
  returnTo: string | null;
  name: string; phone: string; guests: string; messenger: string; wish: string;
  calendarMonth: string | null;
};

const INITIAL: Order = {
  pkg: "extra",
  pkgTouched: false,
  hours: 5,
  hoursTouched: false,
  date: null,
  dateTouched: false,
  hall: "",
  sent: false,
  returnTo: null,
  name: "", phone: "", guests: "", messenger: "", wish: "", calendarMonth: null,
};

let state: Order = INITIAL;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function setOrder(patch: Partial<Order>) {
  state = { ...state, ...patch };
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ expiresAt: Date.now() + DRAFT_TTL, order: { ...state, sent: false } })); } catch { /* Storage is optional. */ }
  emit();
}

/**
 * Выбор пакета. Повторное нажатие по уже выбранному снимает выбор — так же,
 * как у залов во втором блоке.
 *
 * Снятый выбор — это не «пакета нет»: расчёт всё равно должен что-то
 * показывать. Возвращаемся к рекомендованному, и pkgTouched снова false —
 * по нему подпись «наш выбор» отличает совет от решения человека.
 */
export const pickPackage = (pkg: PackageId) =>
  setOrder(
    state.pkgTouched && state.pkg === pkg
      ? { pkg: INITIAL.pkg, pkgTouched: false }
      : { pkg, pkgTouched: true },
  );

/** Выбран ли пакет человеком (а не подсказан нами). */
export const isPackagePicked = (pkg: PackageId) =>
  state.pkgTouched && state.pkg === pkg;

export const pickHours = (hours: number) =>
  setOrder({ hours, hoursTouched: true });

export const pickDate = (date: string) =>
  setOrder({ date, dateTouched: true });

/** Черновик вкладки хранится 24 часа. Согласие и успех не сохраняются. */
const DRAFT_KEY = "mywish:draft:v1";
const DRAFT_TTL = 24 * 60 * 60 * 1000;
let restored = false;
export const pickHall = (hall: string) => setOrder({ hall });
export function restoreHall() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved?.expiresAt > Date.now() && saved.order && typeof saved.order === "object") {
      const o = saved.order;
      const text = (key: string, limit: number) => typeof o[key] === "string" ? o[key].slice(0, limit) : "";
      const date = typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
      state = { ...INITIAL,
        pkg: ["happy", "extra", "wow"].includes(o.pkg) ? o.pkg : INITIAL.pkg,
        pkgTouched: o.pkgTouched === true,
        hours: HOURS.includes(o.hours) ? o.hours : INITIAL.hours,
        hoursTouched: o.hoursTouched === true,
        date, dateTouched: Boolean(date && o.dateTouched),
        hall: HALL_TITLES.includes(o.hall) ? o.hall : "",
        name: text("name", 100), phone: text("phone", 40), guests: text("guests", 30),
        messenger: text("messenger", 200), wish: text("wish", 2000),
        calendarMonth: typeof o.calendarMonth === "string" && /^\d{4}-\d{2}$/.test(o.calendarMonth) ? o.calendarMonth : null,
        returnTo: ["price", "contact"].includes(o.returnTo) ? o.returnTo : null,
      };
      emit();
    } else sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem("mywish:hall");
  } catch { /* Storage is optional. */ }
}
export function resetDraft() {
  state = { ...INITIAL };
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* optional */ }
  emit();
}

export const markSent = () => setOrder({ sent: true });

/** Запомнить, к какому блоку вернуть человека после выбора зала. */
export const setReturnTo = (id: string | null) => setOrder({ returnTo: id });

/** Плавно вернуть к блоку по id и забыть точку возврата. */
export function goBackTo(id: string) {
  setOrder({ returnTo: null });
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * Зал выбран — если человек пришёл за ним из другого блока, вернуть его туда.
 * Пауза нужна, чтобы успела отыграть отметка выбора: галочка на этаже и на
 * шаге; иначе страница уезжает в тот же кадр, и выбор выглядит незавершённым.
 */
export function returnAfterHallPick(delay = 700) {
  const id = state.returnTo;
  if (!id) return;
  setOrder({ returnTo: null });
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, delay);
}

export function useOrder(): Order {
  useEffect(restoreHall, []);
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => INITIAL,
  );
}
