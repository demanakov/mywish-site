"use client";
import Link from "next/link";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { HALLS, LOCATIONS } from "@/lib/halls.mjs";

/**
 * «Где проходит праздник» на телефоне и планшете (ниже 1024).
 *
 * Карта. Живой виджет Яндекса на телефоне не годился: поверх него у каждого
 * нового посетителя баннер про cookie на полкарты, а сама карта перехватывает
 * свайп — страница застревает на ней. Поэтому здесь статичная обзорная карта
 * (public/where/map-overview.webp — Static API Яндекса, 650×450, масштаб 12,
 * все три площадки в кадре) и свои метки поверх. Полноценная навигация —
 * кнопкой «Маршрут», она открывает Яндекс.Карты или приложение.
 *
 * Позиции меток — проекция координат площадок (docs/map-points.kml) в
 * эллиптическом Меркаторе Яндекса относительно центра и масштаба картинки;
 * сверено наложением на картинку с метками Яндекса. При замене картинки
 * (центр ll=30.3213,59.9157, z=12, size=650,450) пересчитать.
 *
 * Карточки — одна за раз, как дома в «Выбери зал»: те же пилюли и тот же
 * порядок (8И, Севкабель, 15А), по умолчанию Севкабель. Листается свайпом по
 * карточке, пилюлями, точками или меткой на карте; всё по кругу. Метка
 * активной площадки подсвечена — карта и карточка говорят об одном месте.
 *
 * Листание — лента из трёх карточек: предыдущая, текущая, следующая. Соседи
 * стоят за краем экрана, поэтому при свайпе следующая карточка въезжает за
 * пальцем сразу, с первого движения, а не после того, как старая доиграла:
 *   • лента едет за пальцем, высота блока перетекает к высоте соседа;
 *   • отпустили дальше четверти ширины или резким взмахом — лента доезжает
 *     до соседа за оставшуюся долю пути;
 *   • не дотянули — пружиной возвращается;
 *   • доехала — индекс сменился, ключи карточек переставились, и лента
 *     без анимации встала обратно на середину: кадр тот же, скачка не видно.
 * Пилюли, точки и метки листают тем же ходом. Анимации — Web Animations API:
 * их можно начать с того места, где ленту отпустил палец.
 * При prefers-reduced-motion — смена без движения.
 */

type Place = {
  location: string;
  tab: string;
  /** Метка на карте, в процентах картинки. */
  x: number;
  y: number;
  /** С какой стороны от метки подпись: у правого края кадра — слева. */
  side: "left" | "right";
  /** Плашка рейтинга из макета и цвет фона, запечённый в неё. */
  rating: string;
  ratingBg: string;
};

const PLACES: Place[] = [
  {
    location: "kachalova-8",
    tab: "Качалова 8И",
    x: 84.75,
    y: 50.78,
    side: "left",
    rating: "rating-2",
    ratingBg: "#fff2f2",
  },
  {
    location: "kozhevennaya-34",
    /* «Севкабель» — так площадку называет заказчик: на Кожевенной линии, 34 — порт «Севкабель». */
    tab: "Севкабель",
    x: 15.28,
    y: 40.22,
    side: "right",
    rating: "rating-1",
    ratingBg: "#fff9f6",
  },
  {
    location: "kachalova-15",
    tab: "Качалова 15А",
    x: 78.37,
    y: 59.42,
    side: "left",
    rating: "rating-3",
    ratingBg: "#fff9f6",
  },
];

const DEFAULT = 1;
const LOCATION = Object.fromEntries(LOCATIONS.map((l) => [l.slug, l]));

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Полный ход ленты на одну карточку; остаток пути — пропорционально. */
const DURATION = 420;
/** Доля ширины, после которой отпущенная лента доезжает до соседа. */
const DISTANCE = 0.25;
/** Скорость взмаха (px/мс), при которой лента уезжает и после короткого жеста. */
const VELOCITY = 0.4;

/** Слоты ленты: 0 — предыдущая, 1 — текущая, 2 — следующая. */
const CURRENT = 1;

/** Сдвиг ленты так, чтобы в окне стоял слот slot, плюс смещение пальца. */
const shift = (slot: number, dx = 0) =>
  `translateX(calc(${-100 * slot}% - ${slot} * var(--m-gutter) + ${dx}px))`;

type Drag = {
  x: number;
  y: number;
  dx: number;
  /** Жест признан горизонтальным — лента едет за пальцем. */
  on: boolean;
  /** Высота текущей карточки в начале жеста. */
  height: number;
  /** Последнее движение — для скорости в момент отпускания. */
  lastX: number;
  lastT: number;
  speed: number;
};

/** Без анимации: так просит система, или вкладка скрыта и кадры не идут. */
const reducedMotion = () =>
  document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Страховка к onfinish: анимацию могут прервать (свернули вкладку посреди
 * листания), и тогда onfinish не придёт, а лента застрянет в состоянии
 * «идёт смена». Шаг выполнится по окончании или по таймеру чуть длиннее
 * анимации — что раньше, и ровно один раз.
 */
function whenDone(animation: Animation, duration: number, step: () => void) {
  let called = false;
  const once = () => {
    if (called) return;
    called = true;
    window.clearTimeout(timer);
    step();
  };
  const timer = window.setTimeout(once, duration + 80);
  animation.onfinish = once;
  animation.oncancel = once;
}

function PlaceCard({ place, current }: { place: Place; current: boolean }) {
  const location = LOCATION[place.location];
  const halls = HALLS.filter((h) => h.location === place.location);

  return (
    <article
      id={current ? "wm-card" : undefined}
      className="wm-card"
      aria-live={current ? "polite" : undefined}
      aria-hidden={current ? undefined : true}
      inert={!current}
    >
      <h3 className="wm-title">{location.title}</h3>
      <p className="wm-metro">
        <svg viewBox="0 0 16 16" aria-hidden fill="none">
          <path
            d="M8 14.5s-5-4.6-5-8.5a5 5 0 0 1 10 0c0 3.9-5 8.5-5 8.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <circle cx="8" cy="6" r="1.8" fill="currentColor" />
        </svg>
        {/* Метро и такси — отдельными строками: у всех площадок одинаковый ритм. */}
        <span>
          <span className="wm-metro-line">{location.metro.split(" · ")[0]}</span>
          <span className="wm-taxi">{location.metro.split(" · ")[1]}</span>
        </span>
      </p>

      <div
        className="wm-rating"
        style={{ "--rating-bg": place.ratingBg } as CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          /*
            Телефонные копии из public/where: обрезаны по содержимому с
            одинаковыми полями. У исходника 8И (public/figma/where, их берёт
            десктоп) полей вдвое больше, и в плашке той же высоты он выходил
            мельче остальных.
          */
          src={`/where/${place.rating}.webp`}
          alt="Рейтинг площадки на Яндекс.Картах"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>

      <p className="wm-caption">Залы на площадке</p>
      <ul className="wm-halls">
        {halls.map((h) => (
          <li key={h.slug}>
            <Link href={`/halls#${h.slug}`} draggable={false}>
              {h.title}
              <span>{h.area} м²</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="wm-actions">
        <Link
          href={`/halls#${place.location}`}
          className="wm-primary"
          draggable={false}
        >
          Залы площадки
        </Link>
        <a
          href={location.map}
          target="_blank"
          rel="noopener noreferrer"
          className="wm-route"
          draggable={false}
        >
          Маршрут
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
      </div>
    </article>
  );
}

export default function WhereMobile() {
  const [index, setIndex] = useState(DEFAULT);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const drag = useRef<Drag | null>(null);
  /** Был свайп — клик, пришедший следом, по ссылке в карточке не срабатывает. */
  const swiped = useRef(false);

  const n = PLACES.length;
  /** Площадки в слотах ленты: предыдущая, текущая, следующая. */
  const slots = [index - 1, index, index + 1].map((i) => (i + n) % n);

  const heightOf = (slot: number) =>
    (stripRef.current?.children[slot] as HTMLElement | undefined)?.offsetHeight ?? 0;

  /*
    Индекс сменился (или первый показ): лента встаёт на середину, окно — по
    высоте текущей карточки. До отрисовки, поэтому перестановка незаметна.
  */
  useLayoutEffect(() => {
    const strip = stripRef.current;
    const viewport = viewportRef.current;
    if (!strip || !viewport) return;
    strip.getAnimations().forEach((a) => a.cancel());
    viewport.getAnimations().forEach((a) => a.cancel());
    strip.style.transform = shift(CURRENT);
    viewport.style.height = `${heightOf(CURRENT)}px`;
    busy.current = false;
  }, [index]);

  /* Карточка поменяла высоту (догрузился шрифт, картинка) — окно следом. */
  useEffect(() => {
    const strip = stripRef.current;
    const viewport = viewportRef.current;
    const card = strip?.children[CURRENT];
    if (!viewport || !card) return;
    const observer = new ResizeObserver(() => {
      if (busy.current || drag.current?.on) return;
      viewport.style.height = `${heightOf(CURRENT)}px`;
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [index]);

  /**
   * К площадке next. fromDx — где лента сейчас (её отпустил палец): ход
   * продолжается оттуда, за оставшуюся долю пути.
   */
  const go = (next: number, fromDx = 0) => {
    const target = (next + n) % n;
    const strip = stripRef.current;
    const viewport = viewportRef.current;
    if (target === index || busy.current) return false;
    busy.current = true;

    const commit = () => setIndex(target);
    if (!strip || !viewport || reducedMotion()) {
      commit();
      return true;
    }

    /* Три площадки по кругу: любая другая — либо следующая, либо предыдущая. */
    const slot = (target - index + n) % n === 1 ? 2 : 0;
    const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
    const full = strip.offsetWidth + gap;
    const left = Math.max(full - Math.abs(fromDx), 0) / full;
    const duration = Math.round(Math.min(Math.max(left * DURATION, 180), DURATION));

    const move = strip.animate(
      [{ transform: shift(CURRENT, fromDx) }, { transform: shift(slot) }],
      { duration, easing: EASE_OUT, fill: "forwards" },
    );
    viewport.animate(
      [{ height: `${viewport.offsetHeight}px` }, { height: `${heightOf(slot)}px` }],
      { duration, easing: EASE_OUT, fill: "forwards" },
    );
    whenDone(move, duration, commit);
    return true;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || busy.current) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      on: false,
      height: heightOf(CURRENT),
      lastX: event.clientX,
      lastT: event.timeStamp,
      speed: 0,
    };
    swiped.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const strip = stripRef.current;
    const viewport = viewportRef.current;
    if (!d || !strip || !viewport) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;

    if (!d.on) {
      /* Пока жест не определился — ждём; ушёл по вертикали — это прокрутка. */
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) {
        if (Math.abs(dy) > 10) drag.current = null;
        return;
      }
      d.on = true;
      swiped.current = true;
      viewport.setPointerCapture(event.pointerId);
    }

    const dt = Math.max(event.timeStamp - d.lastT, 1);
    d.speed = (event.clientX - d.lastX) / dt;
    d.lastX = event.clientX;
    d.lastT = event.timeStamp;

    const width = strip.offsetWidth;
    d.dx = Math.max(-width, Math.min(width, dx));
    strip.style.transform = shift(CURRENT, d.dx);

    /* Высота перетекает к соседу, которого тянут в окно. */
    const progress = Math.abs(d.dx) / width;
    const neighbour = heightOf(d.dx < 0 ? 2 : 0);
    viewport.style.height = `${d.height + (neighbour - d.height) * progress}px`;
  };

  const release = (cancelled: boolean) => {
    const d = drag.current;
    const strip = stripRef.current;
    const viewport = viewportRef.current;
    drag.current = null;
    if (!d || !d.on || !strip || !viewport) return;

    const far = Math.abs(d.dx) > strip.offsetWidth * DISTANCE;
    const flick = Math.abs(d.dx) > 24 && Math.abs(d.speed) > VELOCITY;
    /* Взмах против хода пальца (дотянул и дёрнул обратно) — не листаем. */
    const sameWay = Math.sign(d.speed) === Math.sign(d.dx) || Math.abs(d.speed) < 0.05;
    if (!cancelled && (far || flick) && sameWay && go(index + (d.dx < 0 ? 1 : -1), d.dx)) {
      return;
    }

    /* Не дотянули — пружиной на место. */
    strip.animate([{ transform: shift(CURRENT, d.dx) }, { transform: shift(CURRENT) }], {
      duration: 360,
      easing: EASE_OUT,
    });
    viewport.animate(
      [{ height: viewport.style.height }, { height: `${d.height}px` }],
      { duration: 360, easing: EASE_OUT },
    );
    strip.style.transform = shift(CURRENT);
    viewport.style.height = `${d.height}px`;
  };

  const onClickCapture = (event: MouseEvent) => {
    if (!swiped.current) return;
    swiped.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="wm">
      <div role="tablist" aria-label="Площадки" className="hm-tabs wm-tabs">
        {PLACES.map((p, i) => (
          <button
            key={p.location}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-controls="wm-card"
            className="hm-tab"
            onClick={() => go(i)}
          >
            {p.tab}
          </button>
        ))}
      </div>

      <div className="wm-map">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/where/map-overview.webp"
          alt="Карта Санкт-Петербурга с тремя площадками MyWish"
          width={650}
          height={450}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        {PLACES.map((p, i) => (
          <button
            key={p.location}
            type="button"
            className="wm-pin"
            data-on={i === index}
            data-side={p.side}
            style={{ "--x": `${p.x}%`, "--y": `${p.y}%` } as CSSProperties}
            aria-label={`${p.tab}: ${LOCATION[p.location].title}`}
            aria-pressed={i === index}
            onClick={() => go(i)}
          >
            <span className="wm-dot" aria-hidden />
            <svg className="wm-drop" viewBox="0 0 28 36" aria-hidden>
              <path
                d="M14 35s-11-11.6-11-21a11 11 0 1 1 22 0c0 9.4-11 21-11 21Z"
                fill="currentColor"
                stroke="#fff"
                strokeWidth="2"
              />
              <circle cx="14" cy="14" r="4.2" fill="#fff" />
            </svg>
            <span className="wm-label" aria-hidden>
              {p.tab}
            </span>
          </button>
        ))}
      </div>

      <div
        ref={viewportRef}
        className="wm-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => release(false)}
        onPointerCancel={() => release(true)}
        onClickCapture={onClickCapture}
      >
        <div
          ref={stripRef}
          className="wm-strip"
          style={{ transform: shift(CURRENT) }}
        >
          {slots.map((i, slot) => (
            <PlaceCard
              key={PLACES[i].location}
              place={PLACES[i]}
              current={slot === CURRENT}
            />
          ))}
        </div>
      </div>

      <div className="hm-dots" aria-hidden>
        {PLACES.map((p, i) => (
          <span key={p.location} data-on={i === index} />
        ))}
      </div>
    </div>
  );
}
