"use client";
import Link from "next/link";

import { useState } from "react";
import LegalModal from "./LegalModal";
import FooterMobile from "./FooterMobile";
import { LEGAL, LEGAL_ORDER } from "@/lib/legal";
import type { LegalId } from "@/lib/legal";
import { box, px } from "@/lib/px";
import { CONTACTS } from "@/lib/contacts";
import { LOCATIONS, HALLS } from "@/lib/halls.mjs";

/**
 * CTA-баннер (914:2083) и футер (914:2089).
 * Сцена: баннер макет 10013 → 9057, футер макет 10240 → 9284.
 */

const SITE_LINKS = [
  { label: "Все залы", href: "/halls", y: 45 },
  { label: "Фото и Reels", href: "#gallery", y: 62 },
  { label: "Личный менеджер", href: "#manager", y: 79 },
  { label: "Пакеты", href: "#packages", y: 96 },
  { label: "Еда и меню", href: "#packages", y: 113 },
  { label: "Калькулятор праздника", href: "#price", y: 130 },
  { label: "Как проходит праздник", href: "#how", y: 147 },
  { label: "Локации", href: "#where", y: 166 },
  { label: "Вопросы", href: "#faq", y: 185 },
  { label: "Оставить заявку", href: "#contact", y: 203 },
];

/*
  Список залов берём из общего источника: раньше он лежал здесь копией и в
  своём написании — «Рубинхол» против «Рубин Холл» в форме. Со страницей залов
  расхождение стало бы битой ссылкой, поэтому названия и якоря общие.
*/

const ADDRESSES = LOCATIONS.map((location, index) => ({ label: location.title, map: location.map, y: [47, 69, 92][index] }));

/** Координаты нижней строки из макета; подписи — из самих документов. */
const LEGAL_X = [26, 77, 182, 232];

const COL = "font-sans font-bold uppercase tracking-[0.08em] text-primary";
const LINK = "font-sans text-ink transition-colors hover:text-primary";

export default function Footer() {
  const [legal, setLegal] = useState<LegalId | null>(null);

  return (
    <>
      {/* ── CTA-баннер 914:2083 ────────────────────────────────── */}
      <aside
        data-node-id="914:2083"
        className="u-cta-band flex items-center rounded-lg"
        style={{ ...box(130, 9057, 1180, 131), paddingInline: px(44) }}
      >
        <p className="u-heading text-d-s">
          Ну что, начинаем <em>праздник?</em>
        </p>
        <a
          href="#contact"
          className="u-cta-band-btn ml-auto flex items-center justify-center rounded-pill font-display font-extrabold"
          style={{ width: px(238), height: px(63), fontSize: px(21), letterSpacing: "0.02em" }}
        >
          ОСТАВИТЬ ЗАЯВКУ
        </a>
      </aside>

      {/* ── Футер 914:2089 ─────────────────────────────────────── */}
      <footer
        data-node-id="914:2089"
        className="rounded-lg"
        style={{ ...box(130, 9284, 1180, 362), background: "rgba(255,255,255,0.4)" }}
      >
        {/*
          Логотип 1103:30 — цельный знак из макета. Раньше он собирался из
          отдельной короны и двух надписей: начертания не совпадали с
          фирменными, и знак разъезжался при смене масштаба.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/footer-logo.svg"
          alt="MyWish by Rubin Loft"
          className="max-w-none"
          style={box(26, 25, 117, 45)}
        />
        <p
          className="font-sans text-ink-secondary"
          style={{ ...box(26, 86, 200, 30), fontSize: px(9.8), lineHeight: px(15) }}
        >
          Дни рождения для девушек
          <br />в Санкт-Петербурге.
        </p>

        {/* Колонка «На сайте» */}
        <p className={COL} style={{ ...box(248, 26, 120, 12), fontSize: px(7.6) }}>
          На сайте
        </p>
        {SITE_LINKS.map((l) => (
          <a key={l.label} href={l.href} className={LINK} style={{ ...box(248, l.y, 180, 14), fontSize: px(9.1) }}>
            {l.label}
          </a>
        ))}

        {/* Колонка «Залы» */}
        <p className={COL} style={{ ...box(479, 26, 120, 12), fontSize: px(7.6) }}>
          Залы
        </p>
        {HALLS.map((h, i) => (
          <Link key={h.slug} href={`/halls#${h.slug}`} className={LINK} style={{ ...box(479, 45 + i * 19.3, 150, 14), fontSize: px(9.1) }}>
            {h.title}
          </Link>
        ))}

        {/* Колонка «Адреса» */}
        <p className={COL} style={{ ...box(710, 26, 120, 12), fontSize: px(7.6) }}>
          Адреса
        </p>
        {ADDRESSES.map((a) => (
          <a
            key={a.label}
            href={a.map}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center"
            style={box(710, a.y - 3, 300, 20)}
          >
            <span
              className="inline-flex items-center rounded-xs bg-surface font-sans text-ink"
              style={{ height: px(14), paddingInline: px(4), fontSize: px(6.5) }}
            >
              Яндекс Карты
            </span>
            <span
              className="font-sans text-ink transition-colors group-hover:text-primary"
              style={{ marginLeft: px(6), fontSize: px(9.1) }}
            >
              {a.label}
            </span>
          </a>
        ))}

        {/* Колонка «Связаться» */}
        <p className={COL} style={{ ...box(941, 26, 120, 12), fontSize: px(7.6) }}>
          Связаться
        </p>
        <a href={CONTACTS.phone.href} className={LINK} style={{ ...box(941, 45, 150, 14), fontSize: px(9.1) }}>
          {CONTACTS.phone.label}
        </a>
        <a href={CONTACTS.email.href} className={LINK} style={{ ...box(941, 64, 150, 14), fontSize: px(9.1) }}>
          {CONTACTS.email.label}
        </a>
        <a
          href={CONTACTS.telegram}
          aria-label="Telegram MyWish"
          className="u-msgr flex items-center justify-center rounded-pill bg-surface"
          style={box(941, 92, 29, 29)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma/1-hero/icon-telegram.svg" alt="" aria-hidden style={{ width: px(15), height: px(15) }} />
        </a>
        <a
          href={CONTACTS.max}
          aria-label="MAX MyWish"
          className="u-msgr flex items-center justify-center rounded-pill bg-surface"
          style={box(977, 92, 29, 29)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma/1-hero/icon-max.svg" alt="" aria-hidden style={{ width: px(15), height: px(15) }} />
        </a>

        <button
          type="button"
          onClick={() => setLegal("requisites")}
          className="cursor-pointer text-left font-sans text-ink-muted transition-colors hover:text-primary"
          style={{ ...box(43, 254), fontSize: px(9.1) }}
        >
          Реквизиты организации
        </button>

        {/* Нижняя строка: документы открываются окном поверх страницы */}
        {LEGAL_ORDER.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => setLegal(id)}
            className="cursor-pointer text-left font-sans text-ink-muted transition-colors hover:text-primary"
            style={{ ...box(LEGAL_X[i], 325), fontSize: px(8.3) }}
          >
            {LEGAL[id].label}
          </button>
        ))}
        <p className="font-sans text-ink-muted" style={{ ...box(1081, 325, 100, 12), fontSize: px(8.3) }}>
          Санкт-Петербург
        </p>

        {/* Ниже 1024 — своя раскладка подвала (mobile.css); окно документов общее. */}
        <FooterMobile onLegal={setLegal} />
      </footer>

      <LegalModal id={legal} onClose={() => setLegal(null)} />
    </>
  );
}
