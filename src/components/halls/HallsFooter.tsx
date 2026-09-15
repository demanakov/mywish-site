"use client";
import Link from "next/link";

import { useState } from "react";
import LegalModal from "@/components/LegalModal";
import FooterMobile from "@/components/FooterMobile";
import { LEGAL, LEGAL_ORDER } from "@/lib/legal";
import type { LegalId } from "@/lib/legal";
import { CONTACTS } from "@/lib/contacts";
import { LOCATIONS } from "@/lib/halls.mjs";

/**
 * Подвал страницы залов.
 *
 * Не тот же компонент, что на главной: тот собран абсолютными координатами
 * сцены (box(130, 9284, …)) и живёт только внутри неё. Здесь подвал короче —
 * контакты, адреса и документы, — но собран из тех же токенов, поэтому
 * читается как продолжение, а не как чужая страница.
 *
 * Документы открываются тем же окном, что в подвале главной и под формой.
 */
export default function HallsFooter() {
  const [legal, setLegal] = useState<LegalId | null>(null);

  return (
    <footer className="halls-footer">
      <div className="stage halls-footer-inner">
        <div className="halls-cta u-cta-band">
          <p className="u-heading text-d-s">
            Ну что, начинаем <em>праздник?</em>
          </p>
          <Link href="/#contact" className="u-cta-band-btn halls-cta-btn">
            ОСТАВИТЬ ЗАЯВКУ
          </Link>
        </div>

        <div className="halls-footer-cols">
          <div>
            <p className="halls-footer-head">Связаться</p>
            <a href={CONTACTS.phone.href} className="halls-footer-link">
              {CONTACTS.phone.label}
            </a>
            <a href={CONTACTS.email.href} className="halls-footer-link">
              {CONTACTS.email.label}
            </a>
            <div className="halls-footer-msgr">
              <a
                href={CONTACTS.telegram}
                aria-label="Telegram MyWish"
                className="u-msgr"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/figma/1-hero/icon-telegram.svg" alt="" aria-hidden />
              </a>
              <a href={CONTACTS.max} aria-label="MAX MyWish" className="u-msgr">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/figma/1-hero/icon-max.svg" alt="" aria-hidden />
              </a>
            </div>
          </div>

          <div>
            <p className="halls-footer-head">Адреса</p>
            {LOCATIONS.map((l) => (
              <a
                key={l.slug}
                href={l.map}
                target="_blank"
                rel="noopener noreferrer"
                className="halls-footer-link"
              >
                {l.title}
              </a>
            ))}
          </div>

          <div>
            <p className="halls-footer-head">Сайт</p>
            <Link href="/" className="halls-footer-link">
              На главную
            </Link>
            <Link href="/#packages" className="halls-footer-link">
              Пакеты
            </Link>
            <Link href="/#price" className="halls-footer-link">
              Калькулятор праздника
            </Link>
            <Link href="/#faq" className="halls-footer-link">
              Вопросы
            </Link>
          </div>

          <div>
            <p className="halls-footer-head">Документы</p>
            {LEGAL_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setLegal(id)}
                className="halls-footer-link halls-footer-legal"
              >
                {LEGAL[id].label}
              </button>
            ))}
          </div>
        </div>

        {/* Ниже 1024 — тот же подвал, что на главной (halls.css прячет колонки выше). */}
        <div className="halls-footer-mobile">
          <FooterMobile onLegal={setLegal} />
        </div>
      </div>

      <LegalModal id={legal} onClose={() => setLegal(null)} />
    </footer>
  );
}
