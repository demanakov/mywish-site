"use client";
import { useHydrated } from "@/lib/useHydrated";
import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { HALLS, LOCATIONS } from "@/lib/halls.mjs";
import { createPortal } from "react-dom";
import {
  goBackTo,
  pickHall,
  returnAfterHallPick,
  setReturnTo,
  useOrder,
} from "@/lib/order";

/**
 * «Выбери зал» на телефоне и планшете (ниже 1024).
 *
 * Три дома в ряд, как на десктопе, в ширину телефона не помещаются, а столбцом
 * секция растягивалась на полтора экрана. Поэтому здесь один дом за раз.
 *
 * Сверху вниз:
 *   подзаголовок  — правило выбора: залы стоят одинаково;
 *   табы          — три площадки;
 *   лента домов   — свайп по кругу: за последним домом снова первый;
 *                   соседние дома выглядывают по краям, и без подсказок
 *                   видно, что их листают;
 *   точки         — какой дом из трёх;
 *   карточка зала — всплывает только после нажатия по этажу;
 *   «ВСЕ ЗАЛЫ»    — как на десктопе, с веером фотографий.
 *
 * Названия и площади нарисованы на самих этажах, поэтому постоянного блока
 * со списком под домом нет — он повторял бы картинку. Карточка появляется,
 * когда её есть чем наполнить: нажали на этаж — видно зал и кнопку выбора.
 *
 * Выбор в два шага: нажатие по этажу раскрывает карточку, в заказ зал попадает
 * кнопкой «Выбрать зал». На десктопе хватает одного нажатия, потому что подпись
 * под курсором заранее говорит, что это за зал; на телефоне наведения нет.
 *
 * Лента — нативная прокрутка с примагничиванием, а не свой обработчик жестов:
 * дом заезжает сбоку с инерцией пальца, как в любой галерее телефона, и свайп
 * не спорит с нажатием по этажу — сдвинутый палец браузер кликом не считает.
 *
 * Картинки домов — отдельные, собранные под телефон (public/halls/mobile).
 */

type Floor = { slug: string; shape: [number, number][] };

type House = {
  location: string;
  tab: string;
  src: string;
  /** Размер картинки на сайте — после обрезки прозрачных полей. */
  w: number;
  h: number;
  floors: Floor[];
};

/**
 * Дом, как он описан по исходной PNG.
 *
 * У исходников вокруг дома прозрачные поля (до 113px сверху), и на экране
 * они оборачивались пустой полосой над крышей. В webp поля срезаны, а контуры
 * этажей оставлены в процентах исходника — так их проще сверять с картинкой
 * из макета. Перевод в проценты обрезанной картинки делает frame().
 */
type Source = Omit<House, "w" | "h"> & {
  /** Размер исходной PNG. */
  size: [number, number];
  /** Непрозрачная часть исходника: left, top, width, height. */
  crop: [number, number, number, number];
};

const frame = ({
  size: [W, H],
  crop: [left, top, w, h],
  ...house
}: Source): House => ({
  ...house,
  w,
  h,
  floors: house.floors.map((f) => ({
    slug: f.slug,
    shape: f.shape.map(
      ([x, y]) =>
        [
          +((((x / 100) * W - left) / w) * 100).toFixed(2),
          +((((y / 100) * H - top) / h) * 100).toFixed(2),
        ] as [number, number],
    ),
  })),
});

/**
 * Контур этажа в процентах картинки: прямоугольник от потолка до перекрытия,
 * у перекрытия углы скошены — так нарисован сам дом.
 *   x1, x2  — внутренние края стен;
 *   top     — потолок (низ предыдущего перекрытия);
 *   wall    — где стена встречает скос перекрытия;
 *   bottom  — передний край перекрытия.
 */
const floor = (
  slug: string,
  [x1, x2]: [number, number],
  [top, wall, bottom]: [number, number, number],
  chamfer = 3,
): Floor => ({
  slug,
  shape: [
    [x1, top],
    [x2, top],
    [x2, wall],
    [x2 - chamfer, bottom],
    [x1 + chamfer, bottom],
    [x1, wall],
  ],
});

/*
  Порядок табов — как дома стоят на десктопе: 8И слева, Севкабель (Кожевенная
  линия, 34 — там порт «Севкабель») в центре, 15А справа. Открыт центральный.
*/
const SOURCES: Source[] = [
  {
    location: "kachalova-8",
    tab: "Качалова 8И",
    src: "/halls/mobile/kachalova-8.webp",
    size: [979, 1468],
    crop: [25, 61, 932, 1354],
    floors: [
      floor("barbie", [7.4, 93], [16.1, 39.2, 40.6]),
      floor("sicily", [7.4, 93], [40.6, 65.3, 66.8]),
      floor("ocean-drive", [7.4, 93], [66.8, 90.3, 91.6]),
    ],
  },
  {
    location: "kozhevennaya-34",
    tab: "Севкабель",
    src: "/halls/mobile/kozhevennaya-34.webp",
    size: [1019, 1528],
    crop: [43, 113, 927, 1371],
    floors: [
      floor("white", [8.6, 91.3], [19.6, 41.2, 43.2]),
      floor("flamingo", [8.6, 91.3], [43.2, 67.7, 69.9]),
      floor("black", [8.6, 91.3], [69.9, 91.6, 92.8]),
    ],
  },
  {
    location: "kachalova-15",
    tab: "Качалова 15А",
    src: "/halls/mobile/kachalova-15.webp",
    size: [1019, 1528],
    crop: [28, 107, 963, 1372],
    floors: [
      floor("leonardo", [7.9, 92.7], [19.5, 42.2, 43.7]),
      floor("santa-lucia", [7.9, 92.7], [43.7, 66.8, 68.2]),
      floor("rubin-hall", [7.9, 92.7], [68.2, 91.6, 92.9]),
    ],
  },
];

const HOUSES: House[] = SOURCES.map(frame);

const DEFAULT_HOUSE = 1;

/*
  Слайды ленты — дома по кругу. По краям стоят копии: слева последний дом,
  справа первый. Долистали до копии — лента, остановившись, без анимации
  встаёт на настоящий дом (см. settle), и крутить можно бесконечно.
  Позиция в ленте на единицу больше номера дома.
*/
const SLIDES = [HOUSES.length - 1, ...HOUSES.map((_, i) => i), 0];

/** Веер под «ВСЕ ЗАЛЫ»: сколько держим его раскрытым, прежде чем убрать. */
const FAN_HOLD = 1900;

const HALL = Object.fromEntries(HALLS.map((h) => [h.slug, h]));
const LOCATION = Object.fromEntries(LOCATIONS.map((l) => [l.slug, l]));

/** Веер под «ВСЕ ЗАЛЫ» — в порядке табов: дома слева направо, этажи сверху вниз. */
const FAN = HOUSES.flatMap((house) => house.floors.map((f) => f.slug));

const houseOf = (slug: string | null) =>
  slug === null
    ? -1
    : HOUSES.findIndex((house) => house.floors.some((f) => f.slug === slug));

const clip = (shape: Floor["shape"]) =>
  `polygon(${shape.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;

const points = (shape: Floor["shape"]) =>
  shape.map(([x, y]) => `${x},${y}`).join(" ");

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="m5 12.5 4.5 4.5L19 7.5"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Ширина одного дома в ленте: лента уже экрана, соседи выглядывают по краям. */
const slideWidth = (track: HTMLElement) =>
  (track.firstElementChild as HTMLElement | null)?.offsetWidth ||
  track.clientWidth;

export default function HallsMobile() {
  const order = useOrder();
  const trackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fanRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(DEFAULT_HOUSE);
  const indexRef = useRef(DEFAULT_HOUSE);
  /** Нажатый этаж: подсвечен на доме, под домом — его карточка. */
  const [focus, setFocus] = useState<string | null>(null);
  /** Последний показанный зал — карточка держит его, пока сворачивается. */
  const [lastShown, setLastShown] = useState<string | null>(null);
  const [fanOpen, setFanOpen] = useState(false);

  /*
    Возврат к расчёту. Если к залам пришли по ссылке «выбрать» из итога,
    внизу экрана висит кнопка «Вернуться к расчёту» — пока блок залов на
    экране. Ушёл человек из блока сам (пролистал дальше) — точку возврата
    забываем, чтобы следующий выбор зала никуда его не утаскивал.
  */
  const [hallsInView, setHallsInView] = useState(false);
  const mounted = useHydrated();
  const returnRef = useRef<string | null>(null);
  useEffect(() => { returnRef.current = order.returnTo; }, [order.returnTo]);
  const returnBtnRef = useRef<HTMLButtonElement>(null);

  /*
    Кнопка возврата живёт в правом нижнем углу. Когда через угол проезжает
    «ВСЕ ЗАЛЫ» (она почти во всю ширину), круг приподнимается над ней —
    держится на 12px выше её верхнего края, а потом снова опускается в угол.
    Сдвиг идёт вместе с прокруткой, без анимации: так кажется, будто кнопка
    его подталкивает, а не что он убегает с задержкой.
  */
  useEffect(() => {
    if (!mounted || !order.returnTo) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const button = returnBtnRef.current;
      const all = document.querySelector<HTMLElement>(".hm-all");
      if (!button || !all) return;
      button.style.setProperty("--lift", "0px");
      const circle = button.getBoundingClientRect();
      const bar = all.getBoundingClientRect();
      const crosses =
        bar.bottom > circle.top &&
        bar.top < circle.bottom &&
        bar.right > circle.left &&
        bar.left < circle.right;
      const lift = crosses ? circle.bottom - (bar.top - 12) : 0;
      button.style.setProperty("--lift", `${Math.max(0, lift)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [mounted, order.returnTo]);

  useEffect(() => {
    const section = document.getElementById("halls");
    if (!section) return;
    let seen = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHallsInView(entry.isIntersecting);
        if (entry.isIntersecting) seen = true;
        else if (seen && returnRef.current) setReturnTo(null);
        if (!entry.isIntersecting) seen = false;
      },
      { threshold: 0.15 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const picked = HALLS.find((h) => h.title === order.hall)?.slug ?? null;

  /** Прокрутить к дому i. Его позиция на единицу правее — слева стоит копия. */
  const go = (i: number, smooth: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: (i + 1) * slideWidth(track),
      behavior: smooth ? "smooth" : "instant",
    });
  };

  /* Сервер рисует ленту с начала — после гидрации ставим центральный дом. */
  useEffect(() => {
    go(DEFAULT_HOUSE, false);
  }, []);

  /*
    Зал выбрали где-то ещё — в форме ниже или на странице залов: показываем
    его дом и этаж, чтобы секция не спорила с заказом.
  */
  useEffect(() => {
    if (!picked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize external selection/media with the imperative carousel.
    setFocus(picked);
    const i = houseOf(picked);
    if (i !== indexRef.current) go(i, false);
  }, [picked]);

  /* Сменили дом: карточка чужого дома сворачивается. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize external selection/media with the imperative carousel.
    setFocus((current) => (houseOf(current) === index ? current : null));
  }, [index]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize external selection/media with the imperative carousel.
    if (focus) setLastShown(focus);
  }, [focus]);

  /*
    Веер под «ВСЕ ЗАЛЫ» — один раз: когда кнопка вошла в кадр, карточки
    разворачиваются, держатся пару секунд и уходят обратно под кнопку.
    Это знакомство, а не украшение, которое висит всегда.
  */
  useEffect(() => {
    const el = fanRef.current;
    if (!el) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setFanOpen(true);
        timer = window.setTimeout(() => setFanOpen(false), FAN_HOLD);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  /*
    Текущий дом — тот, что ближе к центру ленты: меняется уже на середине
    свайпа. Копии по краям считаются теми домами, которые повторяют, — табы
    и точки переключаются ещё до перестановки ленты.
  */
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const position = Math.round(track.scrollLeft / slideWidth(track));
    const i = (position - 1 + HOUSES.length) % HOUSES.length;
    if (i !== indexRef.current) {
      indexRef.current = i;
      setIndex(i);
    }
  };

  /*
    Круг. Лента остановилась на копии — без анимации переставляем её на
    настоящий дом: картинка та же пиксель в пиксель, перескока не видно.
    scrollend есть не везде (Safari до 18) — там ждём 140мс тишины.
  */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const n = HOUSES.length;
    let timer = 0;
    const settle = () => {
      const position = Math.round(track.scrollLeft / slideWidth(track));
      if (position === 0) go(n - 1, false);
      else if (position === n + 1) go(0, false);
    };
    const onIdle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 140);
    };
    const native = "onscrollend" in window;
    if (native) track.addEventListener("scrollend", settle);
    else track.addEventListener("scroll", onIdle, { passive: true });

    /* Повернули телефон — ширина дома другая: выравниваем ленту по текущему. */
    const onResize = () => go(indexRef.current, false);
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(timer);
      track.removeEventListener("scrollend", settle);
      track.removeEventListener("scroll", onIdle);
      window.removeEventListener("resize", onResize);
    };
    // go читает только ref-ы — пересоздавать подписки незачем.
     
  }, []);

  const onTabKey = (event: KeyboardEvent, i: number) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (i + step + HOUSES.length) % HOUSES.length;
    /* Шаг по кругу: от крайнего дома — через копию, дальше ленту переставит settle. */
    const track = trackRef.current;
    if (track) track.scrollBy({ left: step * slideWidth(track), behavior: "smooth" });
    tabRefs.current[next]?.focus();
  };

  /** Повторное нажатие по тому же этажу сворачивает карточку. */
  const toggle = (slug: string) =>
    setFocus((current) => (current === slug ? null : slug));

  /*
    Рамка на доме: в текущем — нажатый этаж; в соседних, пока они
    выглядывают сбоку, — выбранный зал, если он там.
  */
  const litIn = (house: House, i: number) => {
    const slug = i === index ? focus : picked;
    return house.floors.some((f) => f.slug === slug) ? slug : null;
  };

  const cardSlug = focus ?? lastShown;
  const cardHall = cardSlug ? HALL[cardSlug] : null;
  const cardPicked = cardHall !== null && picked === cardHall.slug;

  return (
    <div className="halls-mobile">
      <p className="u-lede hm-lede">
        Все залы стоят одинаково. Листай дома и нажимай на этаж.
      </p>

      <div role="tablist" aria-label="Площадки" className="hm-tabs">
        {HOUSES.map((h, i) => (
          <button
            key={h.location}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`hm-tab-${i}`}
            aria-selected={i === index}
            aria-controls={`hm-house-${i}`}
            tabIndex={i === index ? 0 : -1}
            className="hm-tab"
            onClick={() => go(i, true)}
            onKeyDown={(event) => onTabKey(event, i)}
          >
            {h.tab}
          </button>
        ))}
      </div>

      <div ref={trackRef} className="hm-track" onScroll={onScroll}>
        {SLIDES.map((i, position) => {
          const h = HOUSES[i];
          /* Копии крайних домов для круга: видны, но не нажимаются и не читаются. */
          const copy = position === 0 || position === HOUSES.length + 1;
          const lit = litIn(h, i);
          const pickedFloor = h.floors.find((f) => f.slug === picked);
          return (
            <div
              key={`${h.location}-${position}`}
              id={copy ? undefined : `hm-house-${i}`}
              role={copy ? undefined : "tabpanel"}
              aria-labelledby={copy ? undefined : `hm-tab-${i}`}
              aria-hidden={copy || undefined}
              className="hm-slide"
              data-current={i === index}
              data-copy={copy || undefined}
              inert={copy || i !== index}
            >
              <div
                className="hm-house"
                style={{ aspectRatio: `${h.w} / ${h.h}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={h.src}
                  alt={`Дом на ${LOCATION[h.location].title}: три зала`}
                  width={h.w}
                  height={h.h}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />

                <svg
                  className="hm-outline"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  {h.floors.map((f) => (
                    <polygon
                      key={f.slug}
                      points={points(f.shape)}
                      data-on={lit === f.slug}
                    />
                  ))}
                </svg>

                {h.floors.map((f) => {
                  const hall = HALL[f.slug];
                  return (
                    <button
                      key={f.slug}
                      type="button"
                      className="hm-floor"
                      style={{ clipPath: clip(f.shape) }}
                      aria-pressed={lit === f.slug}
                      aria-controls="hm-card"
                      aria-label={`${hall.title}, ${hall.area} м²`}
                      onClick={() => toggle(f.slug)}
                    />
                  );
                })}

                {/* Галочка у выбранного зала — в правом верхнем углу этажа. */}
                {pickedFloor ? (
                  <span
                    key={pickedFloor.slug}
                    className="hm-check"
                    aria-hidden
                    style={{
                      left: `${Math.max(...pickedFloor.shape.map(([x]) => x)) - 5}%`,
                      top: `${Math.min(...pickedFloor.shape.map(([, y]) => y)) + 4}%`,
                    }}
                  >
                    <CheckIcon />
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hm-dots" aria-hidden>
        {HOUSES.map((h, i) => (
          <span key={h.location} data-on={i === index} />
        ))}
      </div>

      {/*
        Карточка зала. Закрыта — не занимает места (grid 0fr), открыта —
        всплывает. Пока сворачивается, показывает последний зал: иначе
        пустела бы на глазах. key по залу — при переходе на другой этаж
        карточка всплывает заново.
      */}
      <div
        id="hm-card"
        className="hm-pop"
        data-open={focus !== null}
        inert={focus === null}
        aria-live="polite"
      >
        <div className="hm-pop-clip">
          {cardHall ? (
            <div key={cardHall.slug} className="hm-pop-card">
              <div className="hm-pop-text">
                <p className="hm-pop-title">{cardHall.title}</p>
                <p className="hm-pop-meta">
                  {cardHall.area} м² · {LOCATION[cardHall.location].title}
                </p>
              </div>
              <button
                type="button"
                className="u-cta hm-pick"
                data-picked={cardPicked}
                aria-pressed={cardPicked}
                aria-label={
                  cardPicked
                    ? `Отменить выбор зала «${cardHall.title}»`
                    : `Выбрать зал «${cardHall.title}»`
                }
                onClick={() => {
                  if (cardPicked) return pickHall("");
                  pickHall(cardHall.title);
                  /* Пришли за залом из расчёта — возвращаем туда. */
                  returnAfterHallPick();
                }}
              >
                {cardPicked ? (
                  <>
                    <CheckIcon /> Выбран
                  </>
                ) : (
                  "Выбрать зал"
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/*
        «ВСЕ ЗАЛЫ» — как на десктопе: красная пилюля и веер живых фотографий
        из-под неё. Наведения на телефоне нет, поэтому веер разыгрывается сам,
        один раз, когда кнопка вошла в кадр. Веер — сосед ссылки, а не её
        ребёнок: внутри пилюли (у неё свой слой из-за backdrop-filter) карточки
        легли бы поверх красного фона.
      */}
      <div ref={fanRef} className="hm-all-wrap" data-open={fanOpen}>
        <span className="hm-fan" aria-hidden>
          {FAN.map((slug, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={slug}
              src={`/halls/${slug}/fan.webp`}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ "--i": i } as CSSProperties}
            />
          ))}
        </span>
        <Link href="/halls" className="u-cta hm-all">
          ВСЕ ЗАЛЫ
        </Link>
      </div>

      {/*
        Кнопка возврата — порталом в body: у секции бывает transform
        (появление при прокрутке), и fixed внутри неё прилип бы к секции.
      */}
      {mounted && order.returnTo
        ? createPortal(
            <button
              ref={returnBtnRef}
              type="button"
              className="hm-return"
              data-shown={hallsInView}
              aria-label="Вернуться к расчёту"
              title="Вернуться к расчёту"
              onClick={() => order.returnTo && goBackTo(order.returnTo)}
            >
              <svg viewBox="0 0 16 16" aria-hidden fill="none">
                <path
                  d="M8 3v10m0 0 4-4m-4 4-4-4"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>,
            document.body,
          )
        : null}
    </div>
  );
}
