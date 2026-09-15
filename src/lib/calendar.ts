"use client";
import { useEffect, useState } from "react";
import { setOrder, useOrder } from "./order";
export const parseKey = (key: string) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };
export function businessDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function useCalendar() {
  const order = useOrder();
  const [todayKey, setTodayKey] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setTodayKey(businessDateKey());
    update(); const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update); document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    if (todayKey && order.date && order.date < todayKey) setOrder({ date: null, dateTouched: false });
  }, [todayKey, order.date]);
  const today = todayKey ? parseKey(todayKey) : null;
  const anchor = today ?? new Date(2026, 0, 1);
  const month = order.calendarMonth ? parseKey(order.calendarMonth + "-01") : anchor;
  const monthOffset = Math.max(0, Math.min(11, (month.getFullYear() - anchor.getFullYear()) * 12 + month.getMonth() - anchor.getMonth()));
  const setMonthOffset = (value: number | ((old: number) => number)) => {
    const n = typeof value === "function" ? value(monthOffset) : value;
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + Math.max(0, Math.min(11, n)), 1);
    setOrder({ calendarMonth: next.getFullYear() + "-" + String(next.getMonth() + 1).padStart(2, "0") });
  };
  return { today, monthOffset, setMonthOffset };
}
