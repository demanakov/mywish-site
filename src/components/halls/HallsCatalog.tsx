"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pickHall, useOrder } from "@/lib/order";
import { LOCATIONS, hallsOf, shotsOf, plansOf } from "@/lib/halls.mjs";
import { useSwipe } from "@/lib/useSwipe";
import HallCard from "./HallCard";

/**
 * Каталог залов: три площадки, по три зала в каждой, и просмотр фотографий.
 *
 * Вёрстка здесь не по координатам макета, как на главной, а потоком. Причина
 * простая: у залов разное число кадров и разной длины подписи, а абсолютные
 * координаты пришлось бы пересчитывать после каждой замены фотографии. Сетка
 * при этом стоит в той же колонке 130…1310, что и вся главная, и собрана из
 * тех же токенов — шрифты, цвета, радиусы и отклики общие.
 *
 * Просмотр — на <dialog> с showModal(), как юридические документы: браузер сам
 * запирает фокус, гасит фон и закрывает по Escape, руками это не повторяем.
 */

/**
 * Что смотрим: фотографии или схему зала.
 *
 * Схемы — изометрические разрезы «кукольного домика»: по ним сразу видно
 * планировку, которую по фотографиям приходится собирать в голове. Держим их
 * отдельным режимом, а не лишними кадрами в общей ленте: иначе счётчик врёт
 * («16 фото», из которых одна — не фотография), а найти схему можно только
 * долистав до конца.
 */
type Mode = "shots" | "plans";
type View = { hall: string; mode: Mode; index: number };

export default function HallsCatalog() {
  const [view, setView] = useState<View | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const order = useOrder();

  const hall = view ? HALL_BY_SLUG[view.hall] : null;
  const frames = hall
    ? view?.mode === "plans"
      ? plansOf(hall)
      : shotsOf(hall)
    : [];

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (view && !el.open) {
      el.showModal();
      /*
        Фокус ставим сами, на саму панель. Браузер по showModal() отдаёт его
        первому, что найдёт в разметке, — ссылке «на карте», и по Enter
        посетителя уносило на Яндекс.Карты вместо просмотра. Атрибут autofocus
        не помогает: React его в разметку не выводит, а вызывает focus() при
        монтировании, то есть до showModal(), который тут же его перебивает.
      */
      el.querySelector<HTMLElement>(".halls-viewer-panel")?.focus();
    }
    if (!view && el.open) el.close();
  }, [view]);

  const step = useCallback((delta: number) => {
    setView((current) => {
      if (!current) return current;
      const h = HALL_BY_SLUG[current.hall];
      const total = current.mode === "plans" ? h.plans.length : h.shots;
      /* По кругу: с последнего кадра вперёд — снова первый. */
      return { ...current, index: (current.index + delta + total) % total };
    });
  }, []);

  /* Свайп по кадру в просмотре — на телефоне основной способ листать. */
  const swipe = useSwipe(step);

  /* Стрелками листаем, пока окно открыто. Escape закрывает сам <dialog>. */
  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, step]);

  return (
    <>
      {LOCATIONS.map((location, li) => (
        <section
          key={location.slug}
          id={location.slug}
          data-section={`halls-${location.slug}`}
          className="halls-location"
        >
          <header className="halls-location-head">
            <span aria-hidden className="halls-location-n">
              {li + 1}
            </span>
            <div>
              <h2 className="halls-location-title">{location.title}</h2>
              <p className="halls-location-metro">{location.metro}</p>
            </div>
            <a
              href={location.map}
              target="_blank"
              rel="noopener noreferrer"
              className="u-maplink halls-location-map"
            >
              Посмотреть на карте
              <svg viewBox="0 0 10 10" aria-hidden fill="none">
                <path
                  d="M2 8 8 2M3.4 2H8v4.6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </header>

          {hallsOf(location.slug).map((h) => (
            <HallCard
              key={h.slug}
              slug={h.slug}
              title={h.title}
              shots={h.shots}
              location={location.title}
              onOpen={(index) => setView({ hall: h.slug, mode: "shots", index })}
            />
          ))}
        </section>
      ))}

      <dialog
        ref={dialogRef}
        className="halls-viewer"
        aria-label={hall ? `Фотографии зала «${hall.title}»` : undefined}
        onClose={() => setView(null)}
        onClick={(e) => {
          /*
            Нажатие по пустому месту закрывает просмотр. На телефоне окно во
            весь экран, и в сам <dialog> почти не попасть — поэтому пустым
            считается всё, кроме кадра, кнопок, ссылок и названия зала.
            Свайп по кадру клик не присылает (useSwipe гасит его).
          */
          const target = e.target as HTMLElement;
          if (
            target.closest(
              "img, button, a, .halls-viewer-half, .halls-viewer-title, .halls-viewer-sub",
            )
          ) {
            return;
          }
          setView(null);
        }}
      >
        {hall && view ? (
          <div className="halls-viewer-panel" tabIndex={-1}>
            {/*
              Название крупно и по центру: зал здесь главный, а не подпись
              к фотографии. На десктопе крестика нет — окно закрывается кликом
              мимо кадра и клавишей Escape, и лишняя кнопка в углу только
              спорила бы с фотографией.

              На телефоне он нужен (виден только ниже 1024, см. halls.css):
              Escape там нет, а кадр стоит во всю ширину, и «мимо кадра» —
              узкая полоса, в которую ещё надо догадаться попасть.
            */}
            <button
              type="button"
              className="halls-viewer-close"
              onClick={() => setView(null)}
              aria-label="Закрыть просмотр"
            >
              <svg viewBox="0 0 12 12" aria-hidden fill="none">
                <path
                  d="M2 2l8 8M10 2 2 10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="halls-viewer-head">
              <p className="halls-viewer-title">{hall.title}</p>
              <p className="halls-viewer-sub">
                {LOCATION_BY_SLUG[hall.location].title}
                {" · "}
                <a
                  href={LOCATION_BY_SLUG[hall.location].map}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  на карте
                </a>
              </p>
            </div>

            {/*
              Переключатель режима. Схема лежит рядом с фотографиями, а не
              внутри их ленты: так счётчик остаётся честным, а найти планировку
              можно сразу, не долистывая до конца.
            */}
            <div className="halls-viewer-modes" role="group" aria-label="Что смотреть">
              {(["shots", "plans"] as Mode[]).map((m) => {
                const total = m === "plans" ? hall.plans.length : hall.shots;
                const on = view.mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    className="halls-viewer-mode"
                    onClick={() => setView({ ...view, mode: m, index: 0 })}
                  >
                    {m === "plans" ? "Схема" : "Фото"}
                    <span aria-hidden>{total}</span>
                  </button>
                );
              })}
            </div>

            <div
              className="halls-viewer-stage"
              data-mode={view.mode}
              {...swipe}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={frames[view.index]}
                src={frames[view.index]}
                alt={
                  view.mode === "plans"
                    ? `Схема зала «${hall.title}», вид ${view.index + 1}`
                    : `${hall.title}, кадр ${view.index + 1} из ${hall.shots}`
                }
                className="halls-viewer-img"
              />
              {/*
                Соседние кадры подгружаем заранее и прячем: без этого на каждом
                нажатии стрелки кадр мигал белым, пока грузился файл.
              */}
              <span aria-hidden className="halls-viewer-preload">
                {[-1, 1].map((d) => {
                  const i = (view.index + d + frames.length) % frames.length;
                  // eslint-disable-next-line @next/next/no-img-element
                  return <img key={d} src={frames[i]} alt="" />;
                })}
              </span>

              {/*
                Половины кадра листают вместе со стрелками: в полноэкранном
                просмотре рука уже на фотографии, и тянуться к маленькой
                стрелке у края — лишнее движение. Это не кнопки, а накладки:
                клавиатуре и скринридеру доступны стрелки рядом, дублировать
                их в списке управления незачем.
              */}
              {frames.length > 1 ? (
                <>
                  <span
                    aria-hidden
                    className="halls-viewer-half halls-viewer-half-prev"
                    onClick={() => step(-1)}
                  />
                  <span
                    aria-hidden
                    className="halls-viewer-half halls-viewer-half-next"
                    onClick={() => step(1)}
                  />
                </>
              ) : null}

              <button
                type="button"
                hidden={frames.length < 2}
                className="halls-viewer-arrow halls-viewer-prev"
                onClick={() => step(-1)}
                aria-label="Предыдущий кадр"
              >
                <svg viewBox="0 0 8 12" aria-hidden fill="none">
                  <path
                    d="M7 1 1.5 6 7 11"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                hidden={frames.length < 2}
                className="halls-viewer-arrow halls-viewer-next"
                onClick={() => step(1)}
                aria-label="Следующий кадр"
              >
                <svg viewBox="0 0 8 12" aria-hidden fill="none">
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

            {/*
              Внизу окна — то же действие, что в карточке: выбрать зал и уйти
              к пакету. Раньше здесь стоял счётчик кадров: он отвечал на
              вопрос, который никто не задавал, а на главный — «беру этот» —
              приходилось закрывать окно и искать кнопку в карточке.
            */}
            <div className="halls-viewer-foot">
              <Link
                href="/#packages"
                className="halls-card-book halls-viewer-book"
                data-picked={order.hall === hall.title}
                onClick={(event) => { if (order.hall === hall.title) { event.preventDefault(); pickHall(""); } else pickHall(hall.title); }}
              >
                {order.hall === hall.title ? "Отменить выбор" : "Выбрать этот зал"}
              </Link>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

const HALL_BY_SLUG = Object.fromEntries(
  LOCATIONS.flatMap((l) => hallsOf(l.slug)).map((h) => [h.slug, h]),
);

const LOCATION_BY_SLUG = Object.fromEntries(
  LOCATIONS.map((l) => [l.slug, l]),
);
