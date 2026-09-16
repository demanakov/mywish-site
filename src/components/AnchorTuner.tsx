"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Настройка переходов по разделам — инструмент, а не часть сайта.
 *
 * Появляется, только если в адресе есть ?anchors. Нужен, чтобы подобрать,
 * где встаёт каждый раздел после перехода по ссылке, глазами, а не числами
 * наугад: перейти к разделу, докрутить страницу до места, где его начало
 * смотрится правильно, и запомнить.
 *
 * «Запомнить» сразу применяет значение к разделу и в режиме разработки
 * записывает его в src/app/anchors.css (обработчик app/api/dev/anchors):
 * файл пересобирается на лету, и переход по ссылке встаёт в новую точку.
 * Список ниже — для сверки, его можно скопировать.
 *
 * Меряется расстояние от верха окна до верха раздела. Отдельно для ПК (от
 * 1024 px) и телефона: панель сама определяет, где открыта.
 */

const SECTIONS: [string, string][] = [
  ["halls", "Выбери зал"],
  ["gallery", "Как выглядит праздник"],
  ["reels", "Reels"],
  ["manager", "Личный менеджер"],
  ["packages", "Пакеты"],
  ["price", "Дата и цена"],
  ["contact", "Заявка"],
  ["how", "Как проходит"],
  ["where", "Адреса"],
  ["faq", "Вопросы"],
];
const KEY = "mywish:anchors";

type Saved = Record<string, number>;

const readSaved = (): Saved => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved;
  } catch {
    return {};
  }
};

export default function AnchorTuner() {
  const hydrated = useHydrated();
  const enabled = hydrated && new URLSearchParams(window.location.search).has("anchors");

  const [id, setId] = useState(SECTIONS[0][0]);
  const [offset, setOffset] = useState(0);
  const [desktop, setDesktop] = useState(true);
  const [rem, setRem] = useState(16);
  const [size, setSize] = useState("");
  const [saved, setSaved] = useState<Saved>(() => (typeof window === "undefined" ? {} : readSaved()));
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const section = document.getElementById(id);
      if (section) setOffset(Math.round(section.getBoundingClientRect().top));
      setDesktop(window.matchMedia("(min-width: 1024px)").matches);
      setRem(parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
      setSize(`${window.innerWidth}×${window.innerHeight}`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled, id]);

  if (!enabled) return null;

  const mode = desktop ? "pc" : "phone";
  const remember = (next: Saved) => {
    setSaved(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* без хранилища — только до перезагрузки */
    }
  };

  const listFor = (m: "pc" | "phone") =>
    SECTIONS.filter(([key]) => saved[`${m}:${key}`] !== undefined)
      .map(([key, label]) => {
        const px = saved[`${m}:${key}`];
        return `  ${key} (${label}): ${px}px${m === "pc" ? ` = ${(px / rem).toFixed(3)}rem` : ""}`;
      })
      .join("\n");
  const report = [
    listFor("pc") && `ПК (окно ${desktop ? size : "—"}, 1rem = ${desktop ? rem.toFixed(2) : "—"}px):\n${listFor("pc")}`,
    listFor("phone") && `Телефон (окно ${!desktop ? size : "—"}):\n${listFor("phone")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const button: React.CSSProperties = {
    padding: "6px 9px",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 8,
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    font: "600 12px/1 system-ui, sans-serif",
    cursor: "pointer",
  };
  const nudge = (px: number) => window.scrollBy({ top: px, behavior: "instant" });

  /* Применить сразу и записать в anchors.css (в разработке). */
  const save = async () => {
    const section = document.getElementById(id);
    if (section) section.style.scrollMarginTop = `${offset}px`;
    remember({ ...saved, [`${mode}:${id}`]: offset });
    setStatus("Записываю…");
    try {
      const response = await fetch("/api/dev/anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, id, px: offset, rem }),
      });
      const result = (await response.json().catch(() => null)) as { value?: string; error?: string } | null;
      setStatus(
        response.ok && result?.value
          ? `Записано в anchors.css: ${result.value}`
          : `В файл не записано${result?.error ? ` (${result.error})` : ""} — действует до перезагрузки`,
      );
    } catch {
      setStatus("В файл не записано — действует до перезагрузки");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 2147483000,
        width: "min(360px, calc(100vw - 16px))",
        padding: 10,
        borderRadius: 12,
        background: "rgba(14,23,54,0.95)",
        color: "#fff",
        font: "12px/1.4 system-ui, sans-serif",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <b>Переходы по разделам · {desktop ? "ПК" : "телефон"}</b>
        <span style={{ opacity: 0.7 }}>{size}</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <select
          value={id}
          onChange={(event) => setId(event.target.value)}
          style={{ flex: 1, padding: 5, borderRadius: 8, font: "12px system-ui, sans-serif" }}
        >
          {SECTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          style={button}
          onClick={() => document.getElementById(id)?.scrollIntoView({ block: "start" })}
        >
          Перейти
        </button>
      </div>

      <div style={{ marginBottom: 6 }}>
        Верх раздела сейчас в <b style={{ fontSize: 14 }}>{offset}px</b> от верха окна
        {saved[`${mode}:${id}`] !== undefined ? ` · сохранено ${saved[`${mode}:${id}`]}px` : ""}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        <button type="button" style={button} onClick={() => nudge(10)}>▲ 10</button>
        <button type="button" style={button} onClick={() => nudge(1)}>▲ 1</button>
        <button type="button" style={button} onClick={() => nudge(-1)}>▼ 1</button>
        <button type="button" style={button} onClick={() => nudge(-10)}>▼ 10</button>
        <button
          type="button"
          style={{ ...button, background: "#db404f", borderColor: "#db404f", marginLeft: "auto" }}
          onClick={save}
        >
          Запомнить
        </button>
      </div>

      {status ? <div style={{ marginBottom: 6, color: "#9fe3b0" }}>{status}</div> : null}

      {report ? (
        <>
          <textarea
            readOnly
            value={report}
            onFocus={(event) => event.currentTarget.select()}
            style={{
              width: "100%",
              height: 110,
              padding: 6,
              borderRadius: 8,
              font: "11px/1.35 ui-monospace, monospace",
              color: "#0e1736",
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button
              type="button"
              style={button}
              onClick={() => {
                navigator.clipboard?.writeText(report).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              {copied ? "Скопировано" : "Скопировать"}
            </button>
            <button type="button" style={button} onClick={() => remember({})}>
              Очистить всё
            </button>
          </div>
        </>
      ) : (
        <div style={{ opacity: 0.7 }}>
          Выберите раздел, «Перейти», докрутите до нужного места и «Запомнить».
        </div>
      )}
    </div>
  );
}
