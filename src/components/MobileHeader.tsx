"use client";
import { useHydrated } from "@/lib/useHydrated";
import Link from "next/link";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import HeaderHome from "./HeaderHome";
import { CONTACTS } from "@/lib/contacts";

/**
 * Шапка телефона и планшета (ниже 1024): звонок — логотип — меню.
 *
 * Десктопная шапка в ширину телефона не помещается: меню из трёх пунктов,
 * две соцсети и номер. Поэтому на узком экране остаются два действия, ради
 * которых шапку и открывают, — позвонить и найти раздел, — а всё остальное
 * уходит в меню.
 *
 * Шапок две: на первом экране и плавающая (MobileFloatingHeader), которая
 * выезжает при прокрутке вверх. У каждой своё окно меню — id через useId.
 *
 * Меню — <dialog> с showModal(): фокус заперт внутри, Escape закрывает.
 * Окно вынесено порталом в <body>: шапка первого экрана прячется при
 * прокрутке, и меню внутри неё спряталось бы вместе с ней.
 *
 * Анимация ведётся состоянием, а не :open/@starting-style:
 *   открыть  — showModal(), фокус на панель без прокрутки (иначе браузер
 *              фокусирует крестик и может сдвинуть экран), через кадр
 *              data-state="open": панель проявляется с коротким сдвигом;
 *   закрыть  — data-state="closing", переход назад, и только потом close().
 * Прокрутку запирает признак на <html>; при закрытии он снимается сразу —
 * переход по разделу из меню срабатывает, не дожидаясь конца анимации.
 */

const SECTIONS = [
  { href: "/#halls", label: "Выбрать зал" },
  { href: "/halls", label: "Все залы с фото" },
  { href: "/#gallery", label: "Фото и Reels" },
  { href: "/#manager", label: "Личный менеджер" },
  { href: "/#packages", label: "Пакеты и еда" },
  { href: "/#price", label: "Дата и цена" },
  { href: "/#how", label: "Как проходит праздник" },
  { href: "/#where", label: "Адреса" },
  { href: "/#faq", label: "Вопросы" },
];

/** Длительность закрытия панели — совпадает с переходом в mobile.css. */
const DURATION = 220;

const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={d} />
  </svg>
);

const PHONE =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z";
const BURGER = "M4 7h16M4 12h16M4 17h16";
const CROSS = "M6 6l12 12M18 6 6 18";

type MenuState = "closed" | "open" | "closing";

export default function MobileHeader({
  animated = false,
  floating = false,
}: {
  /** Первый экран: элементы выезжают сверху лесенкой. */
  animated?: boolean;
  /** Плавающая шапка при прокрутке вверх. */
  floating?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const menuId = useId();
  const [state, setState] = useState<MenuState>("closed");
  /* Портал возможен только в браузере: document на сервере нет. */
  const mounted = useHydrated();

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      delete document.documentElement.dataset.menuOpen;
    };
  }, []);

  const show = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    window.clearTimeout(timer.current);
    if (!dialog.open) dialog.showModal();
    panelRef.current?.focus({ preventScroll: true });
    document.documentElement.dataset.menuOpen = "";
    /* Два кадра: браузер успевает отрисовать исходное положение панели. */
    requestAnimationFrame(() => requestAnimationFrame(() => setState("open")));
  };

  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    delete document.documentElement.dataset.menuOpen;
    setState("closing");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      dialog.close();
      setState("closed");
    }, DURATION);
  };

  /* На первом экране пункты выезжают той же лесенкой, что десктопная шапка. */
  const slot = (className: string, delay: number, children: ReactNode) => (
    <span
      className={animated ? `${className} hero-drop` : className}
      style={animated ? ({ "--delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </span>
  );

  return (
    <div className={floating ? "m-header m-header-floating" : "m-header"}>
      {slot(
        "m-header-side",
        0,
        <a
          href={CONTACTS.phone.href}
          className="m-round"
          aria-label={`Позвонить: ${CONTACTS.phone.label}`}
        >
          <Icon d={PHONE} />
        </a>,
      )}

      {slot("m-header-logo", 60, <HeaderHome />)}

      {slot(
        "m-header-side",
        120,
        <button
          type="button"
          className="m-round m-round-menu"
          aria-label="Открыть меню"
          aria-haspopup="dialog"
          aria-expanded={state === "open"}
          aria-controls={menuId}
          onClick={show}
        >
          <Icon d={BURGER} />
        </button>,
      )}

      {mounted &&
        createPortal(
          <dialog
            id={menuId}
            ref={dialogRef}
            className="m-menu"
            data-state={state}
            aria-label="Меню"
            onCancel={(event) => {
              /* Escape — тоже с анимацией, а не щелчком. */
              event.preventDefault();
              close();
            }}
            onClose={() => setState("closed")}
          >
            {/* Затемнение: нажатие мимо панели закрывает меню. */}
            <div className="m-menu-shade" aria-hidden onClick={close} />

            <div className="m-menu-panel" ref={panelRef} tabIndex={-1}>
              <div className="m-menu-top">
                <span className="m-menu-title">Меню</span>
                <button
                  type="button"
                  className="m-round"
                  aria-label="Закрыть меню"
                  onClick={close}
                >
                  <Icon d={CROSS} />
                </button>
              </div>

              <nav
                aria-label="Разделы"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a")) close();
                }}
              >
                <ul className="m-menu-links">
                  {SECTIONS.map((item) => (
                    <li key={item.href}>
                      <a href={item.href}>{item.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Главное действие страницы — отдельной кнопкой, а не строкой списка. */}
              <Link href="/#contact" className="u-cta m-menu-cta" onClick={close}>
                ОСТАВИТЬ ЗАЯВКУ
              </Link>

              <div className="m-menu-contacts">
                <a href={CONTACTS.phone.href} className="m-menu-phone">
                  {CONTACTS.phone.label}
                </a>
                <div className="m-menu-msgrs">
                  <a href={CONTACTS.telegram} className="m-menu-msgr">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/figma/1-hero/icon-telegram.svg" alt="" aria-hidden />
                    Telegram
                  </a>
                  <a href={CONTACTS.max} className="m-menu-msgr">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/figma/1-hero/icon-max.svg" alt="" aria-hidden />
                    MAX
                  </a>
                </div>
                <p className="m-menu-note">
                  Санкт-Петербург · Кожевенная линия, 34А · Профессора Качалова, 8И и 15А
                </p>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </div>
  );
}
