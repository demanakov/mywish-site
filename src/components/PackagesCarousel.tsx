"use client";

import {
  Children,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/**
 * «Выбери пакет» на телефоне и планшете (ниже 1024) — по образцу выбора зала.
 *
 * Карточки остаются серверными (Packages.tsx) и приходят сюда детьми; эта
 * обёртка только раскладывает их лентой:
 *   пилюли  — три пакета, нажатие ведёт к карточке;
 *   лента   — одна карточка на экране, соседние выглядывают по краям, меньше
 *             и тише; свайп по кругу: за «Вау» снова «Хэппи»;
 *   точки   — какая карточка из трёх.
 * По умолчанию открыта «Экстра» — наш выбор. Выбранные пилюля и точка — в
 * цветах своего пакета (data-theme, вид в mobile.css).
 *
 * На десктопе обёртки ведут себя как display: contents: карточки стоят на
 * координатах макета, пилюль и точек нет, копий для круга тоже.
 *
 * Круг. По краям ленты копии крайних карточек: [копия «Вау», Хэппи, Экстра,
 * Вау, копия «Хэппи»]. Лента, остановившись на копии, без анимации встаёт на
 * настоящую карточку.
 *
 * Крупной и яркой считается карточка на месте (позиция в ленте), а не пакет.
 * Пока «текущим» был пакет, копия, на которую въезжала лента, оставалась
 * уменьшенной и приглушённой — и после перестановки рывком становилась
 * полной. Теперь копия на месте выглядит ровно как настоящая, и перестановка
 * незаметна.
 *
 * Пилюли ведут по кругу кратчайшим путём — всегда на один шаг: из «Хэппи»
 * в «Вау» лента едет влево на копию, а не вправо через «Экстру».
 *
 * Касание соседней карточки не выбирает пакет, а подводит её к центру:
 * выбор — действие, и случайное касание края ленты не должно уводить к расчёту.
 */

const NARROW = "(max-width: 1023.98px)";

export default function PackagesCarousel({
  labels,
  themes,
  ribbon,
  initial,
  children,
}: {
  /** Подписи пилюль в порядке карточек. */
  labels: string[];
  /** Цветовая схема каждой карточки — ею же красятся выбранные пилюля и точка. */
  themes: string[];
  /** Номер карточки с ленточкой «наш выбор». */
  ribbon: number;
  /** Карточка, открытая по умолчанию. */
  initial: number;
  children: ReactNode;
}) {
  const cards = Children.toArray(children);
  const n = cards.length;

  const trackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [narrow, setNarrow] = useState(false);
  /** Позиция в ленте. На телефоне — с учётом копии слева. */
  const [pos, setPos] = useState(initial);
  const posRef = useRef(initial);

  const offset = narrow ? 1 : 0;
  /** Карточка в каждой позиции ленты. На телефоне — с копиями по краям. */
  const slides = narrow
    ? [n - 1, ...cards.map((_, i) => i), 0]
    : cards.map((_, i) => i);
  /** Какой пакет сейчас на месте. */
  const index = narrow ? slides[pos] ?? initial : initial;

  const setPosition = (p: number) => {
    posRef.current = p;
    setPos(p);
  };

  useEffect(() => {
    const media = window.matchMedia(NARROW);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const slideWidth = (track: HTMLElement) =>
    (track.firstElementChild as HTMLElement | null)?.offsetWidth ||
    track.clientWidth;

  /** Прокрутить к позиции p ленты (с учётом копий). */
  const goPos = (p: number, smooth: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: p * slideWidth(track),
      behavior: smooth ? "smooth" : "instant",
    });
  };

  /* Лента дорисована на телефоне — ставим карточку по умолчанию. */
  useEffect(() => {
    const start = initial + offset;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize external selection/media with the imperative carousel.
    setPosition(start);
    if (narrow) goPos(start, false);
    // goPos читает только ref — пересоздавать эффект незачем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow]);

  /* Карточка на месте — ближайшая к центру: меняется уже на середине свайпа. */
  const onScroll = () => {
    const track = trackRef.current;
    if (!narrow || !track) return;
    const p = Math.round(track.scrollLeft / slideWidth(track));
    if (p !== posRef.current) setPosition(p);
  };

  /*
    Круг: остановились на копии — без анимации встаём на настоящую карточку.
    На время перестановки анимации выключены (data-jumping): соседи по краям
    меняются ролями, и без этого они бы «вздрогнули». scrollend есть не
    везде — там ждём 140мс тишины.
  */
  useEffect(() => {
    const track = trackRef.current;
    if (!narrow || !track) return;
    let idle = 0;
    let release = 0;
    const settle = () => {
      const p = Math.round(track.scrollLeft / slideWidth(track));
      const target = p === 0 ? n : p === n + 1 ? 1 : -1;
      if (target < 0) return;
      track.dataset.jumping = "";
      goPos(target, false);
      setPosition(target);
      window.clearTimeout(release);
      release = window.setTimeout(() => delete track.dataset.jumping, 160);
    };
    const onIdle = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(settle, 140);
    };
    const native = "onscrollend" in window;
    if (native) track.addEventListener("scrollend", settle);
    else track.addEventListener("scroll", onIdle, { passive: true });
    const onResize = () => goPos(posRef.current, false);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(idle);
      window.clearTimeout(release);
      track.removeEventListener("scrollend", settle);
      track.removeEventListener("scroll", onIdle);
      window.removeEventListener("resize", onResize);
    };
    // Функции выше читают только ref-ы — пересоздавать подписки незачем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, n]);

  /* Шаг по кругу: на соседнюю позицию, дальше при необходимости переставит settle. */
  const step = (delta: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = posRef.current + delta;
    goPos(target, true);
    setPosition(target);
  };

  /* Пилюля: кратчайший путь по кругу. */
  const goTo = (i: number) => {
    if (!narrow) return;
    const forward = (i - index + n) % n;
    if (forward === 0) return;
    step(forward <= n / 2 ? forward : forward - n);
  };

  const onTabKey = (event: KeyboardEvent, i: number) => {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    step(delta);
    tabRefs.current[(i + delta + n) % n]?.focus();
  };

  return (
    <div className="pk-carousel contents">
      <div role="tablist" aria-label="Пакеты" className="hm-tabs pk-nav">
        {labels.map((label, i) => (
          <button
            key={label}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`pk-tab-${i}`}
            aria-selected={i === index}
            aria-controls={`pk-card-${i}`}
            tabIndex={i === index ? 0 : -1}
            className="hm-tab"
            data-theme={themes[i]}
            onClick={() => goTo(i)}
            onKeyDown={(event) => onTabKey(event, i)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={trackRef}
        className="pk-track contents"
        onScroll={onScroll}
        /*
          Касание по полю ленты, мимо карточек — там выглядывают соседи, и
          палец целится именно в них: листаем в ту сторону.
        */
        onClick={(event) => {
          const track = trackRef.current;
          if (!narrow || !track || event.target !== track) return;
          const box = track.getBoundingClientRect();
          step(event.clientX > box.left + box.width / 2 ? 1 : -1);
        }}
      >
        {slides.map((i, p) => {
          const copy = narrow && (p === 0 || p === n + 1);
          const current = !narrow || p === pos;
          return (
            <div
              key={copy ? `copy-${p}` : `card-${i}`}
              id={copy || !narrow ? undefined : `pk-card-${i}`}
              role={copy || !narrow ? undefined : "tabpanel"}
              aria-labelledby={copy || !narrow ? undefined : `pk-tab-${i}`}
              aria-hidden={copy || undefined}
              inert={copy || (narrow && !current)}
              className="pk-slide contents"
              data-current={narrow ? current : undefined}
              /* Сосед уменьшается к ближней стороне — его край остаётся виден. */
              data-side={
                narrow && !current ? (p < pos ? "prev" : "next") : undefined
              }
              /*
                Касание соседней карточки подводит её к центру, а не выбирает
                пакет: перехватываем клик до обработчика секции (PackagesChoice).
              */
              onClickCapture={(event) => {
                if (!narrow || current) return;
                event.preventDefault();
                event.stopPropagation();
                step(p < posRef.current ? -1 : 1);
              }}
            >
              <div className="pk-frame contents">
                {i === ribbon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/figma/packages/sticker.webp"
                    alt=""
                    aria-hidden
                    className="pk-ribbon"
                  />
                ) : null}
                {cards[i]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hm-dots pk-nav" aria-hidden>
        {labels.map((label, i) => (
          <span key={label} data-on={i === index} data-theme={themes[i]} />
        ))}
      </div>
    </div>
  );
}
