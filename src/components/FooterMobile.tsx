"use client";
import Link from "next/link";
import CurrentYear from "./CurrentYear";

import { CONTACTS } from "@/lib/contacts";
import { HALLS, LOCATIONS } from "@/lib/halls.mjs";
import { LEGAL, LEGAL_ORDER, type LegalId } from "@/lib/legal";

/**
 * Подвал на телефоне и планшете (ниже 1024).
 *
 * Десктопный подвал — четыре колонки по координатам макета. Столбцом они
 * растягивались на экран с лишним, всё по левому краю, а кнопки мессенджеров
 * стояли друг под другом. Здесь по привычному для телефона образцу:
 *   бренд       — знак и подпись по центру;
 *   связь       — номер крупно, мессенджеры и почта круглыми кнопками в ряд:
 *                 это главное, за чем в подвал приходят;
 *   навигация   — три свёрнутых раздела (<details>): ссылок больше двадцати,
 *                 и открытыми они снова заняли бы полэкрана;
 *   низ         — документы одной строкой и город.
 * Окно документов общее с десктопом — его открывает Footer.
 */

/* Ссылки от корня: подвал стоит и на странице залов, оттуда они ведут на главную. */
const SITE_LINKS = [
  { label: "Все залы", href: "/halls" },
  { label: "Фото и Reels", href: "/#gallery" },
  { label: "Личный менеджер", href: "/#manager" },
  { label: "Пакеты и еда", href: "/#packages" },
  { label: "Калькулятор", href: "/#price" },
  { label: "Как проходит", href: "/#how" },
  { label: "Адреса", href: "/#where" },
  { label: "Вопросы", href: "/#faq" },
];

const TAB: Record<string, string> = {
  "kachalova-8": "Качалова 8И",
  "kozhevennaya-34": "Кожевенная",
  "kachalova-15": "Качалова 15А",
};

/* Порядок площадок — как дома в «Выбери зал». */
const PLACE_ORDER = ["kachalova-8", "kozhevennaya-34", "kachalova-15"];

function Chevron() {
  return (
    <svg className="fm-chevron" viewBox="0 0 16 16" aria-hidden fill="none">
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FooterMobile({
  onLegal,
}: {
  onLegal: (id: LegalId) => void;
}) {
  const places = PLACE_ORDER.map((slug) => LOCATIONS.find((l) => l.slug === slug)!);

  return (
    <div className="fm">
      <div className="fm-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma/footer-logo.svg" alt="MyWish by Rubin Loft" width={117} height={45} />
        <p>Дни рождения для девушек в&nbsp;Санкт-Петербурге</p>
      </div>

      <div className="fm-contact">
        <a href={CONTACTS.phone.href} className="fm-phone">
          {CONTACTS.phone.label}
        </a>
        <div className="fm-socials">
          <a href={CONTACTS.telegram} className="fm-social" aria-label="Telegram MyWish">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma/1-hero/icon-telegram.svg" alt="" aria-hidden />
          </a>
          <a href={CONTACTS.max} className="fm-social" aria-label="MAX MyWish">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma/1-hero/icon-max.svg" alt="" aria-hidden />
          </a>
          <a href={CONTACTS.email.href} className="fm-social" aria-label={`Почта ${CONTACTS.email.label}`}>
            <svg viewBox="0 0 20 20" aria-hidden fill="none">
              <rect x="2.5" y="4.5" width="15" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="m3.5 6 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
        <a href={CONTACTS.email.href} className="fm-email">
          {CONTACTS.email.label}
        </a>
      </div>

      <nav className="fm-nav" aria-label="Подвал">
        <details className="fm-group">
          <summary>
            На сайте
            <Chevron />
          </summary>
          <ul className="fm-links">
            {SITE_LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </details>

        <details className="fm-group">
          <summary>
            Залы
            <Chevron />
          </summary>
          <div className="fm-halls">
            {places.map((place) => (
              <div key={place.slug} className="fm-place">
                <p>{TAB[place.slug]}</p>
                <ul>
                  {HALLS.filter((h) => h.location === place.slug).map((h) => (
                    <li key={h.slug}>
                      <Link href={`/halls#${h.slug}`}>{h.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>

        <details className="fm-group">
          <summary>
            Адреса
            <Chevron />
          </summary>
          <ul className="fm-addresses">
            {places.map((place) => (
              <li key={place.slug}>
                <a href={place.map} target="_blank" rel="noopener noreferrer">
                  <span>
                    <b>{place.title}</b>
                    <small>{place.metro.split(" · ")[0]}</small>
                  </span>
                  <svg viewBox="0 0 10 10" aria-hidden fill="none">
                    <path d="M2 8 8 2M3.4 2H8v4.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </details>
      </nav>

      <div className="fm-bottom">
        <p className="fm-legal">
          {LEGAL_ORDER.map((id) => (
            <button key={id} type="button" onClick={() => onLegal(id)}>
              {LEGAL[id].label}
            </button>
          ))}
        </p>
        <p className="fm-city">© {<CurrentYear />} MyWish · Санкт-Петербург</p>
      </div>
    </div>
  );
}
