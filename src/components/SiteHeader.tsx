import type { ReactNode } from "react";
import HeaderHome from "./HeaderHome";
import MobileHeader from "./MobileHeader";
import { box } from "@/lib/px";
import { CONTACTS } from "@/lib/contacts";

/**
 * Статическая шапка поверх первого экрана — одна на все страницы сайта.
 *
 * Раньше эта разметка жила только в Hero. Со страницей залов её пришлось бы
 * держать в двух копиях, а шапку правят часто: последними были телефон вместо
 * «СВЯЗАТЬСЯ» и сдвиг соцсетей. Ровно за этим она и вынесена — как до того
 * контакты в contacts.ts.
 *
 * Координаты те же, что были: логотип 37, меню 52, соцсети и телефон 51.
 * Это важно не только для верности макету — на них завязана передача
 * плавающей шапке (её смещение ровно 17px, см. FloatingHeader).
 *
 * Различие между страницами только одно — выезд. На первом экране элементы
 * приезжают сверху лесенкой (`hero-drop` + `--delay`), на остальных просто
 * стоят на месте. Поэтому разметка общая, а обёртка пункта разная.
 */

const NAV = [
  { href: "/#halls", label: "Залы" },
  { href: "/#packages", label: "Пакеты" },
  { href: "/#price", label: "Цены" },
  { href: "/#contact", label: "Заявка" },
];

/** Обводка, тень и размытие кнопки: блок вставлен в макет в масштабе 2.545. */
const CTA: React.CSSProperties = {
  borderWidth: "0.0681rem",
  boxShadow: "0 1.0925rem 3.0719rem rgba(28,17,23,0.24)",
  backdropFilter: "blur(1.2288rem)",
};

const CHIP =
  "site-header-chip group flex size-full items-center justify-center rounded-pill border-[0.0675rem] border-[rgba(255,241,242,0.14)] bg-[rgba(255,249,247,0.07)] transition-[transform,background-color,color,border-color,box-shadow] duration-200 hover:-translate-y-2 hover:border-primary hover:bg-surface hover:shadow-[0_0.375rem_0.875rem_rgba(28,17,23,0.22)]";

type Slot = {
  key: string;
  /** Координаты в макете. */
  at: [number, number, number, number];
  /** Сдвиг выезда относительно начала — только для первого экрана. */
  delay: number;
  node: ReactNode;
};

const SLOTS: Slot[] = [
  {
    key: "logo",
    at: [131, 37, 171, 69],
    delay: 0,
    /*
      Логотип 914:1028. В макете это статичная картинка, но со второй
      страницей знак стал единственным способом вернуться на главную —
      привычка нажимать на него сильнее любой навигации. Поэтому ссылка,
      и та же самая — в плавающей шапке (см. HeaderHome).
    */
    node: <HeaderHome />,
  },
  {
    key: "nav",
    at: [477, 52, 397, 39],
    delay: 90,
    /* Навигация 914:1136 — у каждого пункта своя пилюля при наведении. */
    node: (
      <nav
        aria-label="Основная навигация"
        className="relative grid size-full grid-cols-4 rounded-pill"
        style={{ backgroundColor: "rgba(252,225,227,0.72)" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-pill"
          style={{
            inset: "-0.0672rem",
            border: "0.1345rem solid rgba(255,255,255,0.5)",
          }}
        />
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group relative flex items-center justify-center rounded-pill font-sans text-m font-bold text-ink-secondary transition-colors hover:text-primary"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-pill bg-surface opacity-0 shadow-[0_0.125rem_0.5rem_rgba(28,17,23,0.12)] transition-opacity duration-200 group-hover:opacity-100"
            />
            <span className="relative">{item.label}</span>
          </a>
        ))}
      </nav>
    ),
  },
  {
    key: "telegram",
    at: [1010, 51, 41, 41],
    delay: 180,
    /* Соцсети 914:1116 / 914:1119. */
    node: (
      <a href={CONTACTS.telegram} aria-label="Telegram MyWish" className={`${CHIP} site-header-telegram`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/1-hero/icon-telegram.svg"
          alt=""
          aria-hidden
          className="size-21 transition-transform duration-200 group-hover:scale-110"
        />
      </a>
    ),
  },
  {
    key: "max",
    at: [1058, 51, 41, 41],
    delay: 250,
    node: (
      <a href={CONTACTS.max} aria-label="MAX MyWish" className={`${CHIP} site-header-social`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/1-hero/icon-max.svg"
          alt=""
          aria-hidden
          className="size-21 rounded-sm transition-transform duration-200 group-hover:scale-110"
        />
      </a>
    ),
  },
  {
    key: "phone",
    at: [1114, 51, 198, 41],
    delay: 330,
    /*
      Телефон на месте CTA 914:1134. Отступление от макета осознанное: шапка
      одна на весь сайт, и при передаче плавающей шапке кнопка не должна
      менять надпись на глазах. Правый край на 1312, как у кнопки; ширина 198
      под номер, соцсети сдвинуты влево на те же 65 — как в FloatingHeader.
    */
    node: (
      <a
        href={CONTACTS.phone.href}
        className="u-cta u-header-phone size-full whitespace-nowrap text-btn"
        style={CTA}
      >
        {CONTACTS.phone.label}
      </a>
    ),
  },
];

export default function SiteHeader({
  animated = false,
  shown = true,
}: {
  /** Первый экран: элементы выезжают сверху лесенкой. */
  animated?: boolean;
  /** Для выезда — момент включения. */
  shown?: boolean;
}) {
  /*
    hero-static-header — метка для передачи плавающей шапке: пока та на
    экране, эта прячется (см. globals.css, :root[data-header-owner]).
  */
  return (
    <div
      className={`hero-static-header absolute inset-0 ${
        animated ? "hero-gate hero-interface-layer" : "z-20"
      }`}
      data-shown={animated ? shown : undefined}
    >
      {SLOTS.map((slot) => (
        <span
          key={slot.key}
          className={
            animated
              ? "site-header-slot hero-drop absolute"
              : "site-header-slot absolute"
          }
          style={
            {
              ...box(...slot.at),
              ...(animated ? { "--delay": `${slot.delay}ms` } : null),
            } as React.CSSProperties
          }
        >
          {slot.node}
        </span>
      ))}

      {/* Ниже 1024 вместо пунктов выше — звонок, логотип и меню (mobile.css). */}
      <MobileHeader animated={animated} />
    </div>
  );
}
