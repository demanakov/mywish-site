"use client";

import { useEffect, useRef, useState } from "react";
import SectionHeading from "./SectionHeading";
import { box, px } from "@/lib/px";
import { useOrder } from "@/lib/order";

/**
 * Секция 9 «что дальше» — Figma 914:1865 … 914:1872.
 * Сцена: макет 7850…8467 → 6894 на странице.
 *
 * Карточки на прищепках — одна картинка (914:1866, «image 122»): объём, тени
 * и металл прищепок вёрсткой не повторить. А весь текст поверх неё настоящий:
 * раньше он приезжал отрендеренными нодами, из-за чего мылился и сидел ниже,
 * чем в макете. Координаты и кегли — из макета, отсчёт от начала секции.
 */

type Step = {
  node: string;
  /** Габарит группы в макете — от него отсчитывается всё внутри. */
  at: [number, number, number, number];
  num: { at: [number, number, number]; text: string };
  title: {
    at: [number, number, number];
    text: string;
    lh: number;
    accent?: true;
  };
  body?: { at: [number, number, number, number]; text: string };
};

const STEPS: Step[] = [
  {
    node: "914:1880",
    at: [164, 243, 213, 252],
    num: { at: [0, 0, 29], text: "01" },
    title: { at: [0, 35, 212], text: "Твой выбор", lh: 50 },
  },
  {
    node: "914:1868",
    at: [459, 243, 230, 351],
    num: { at: [0, 0, 30], text: "02" },
    title: { at: [0, 47, 159], text: "Проверим и подтвердим", lh: 23 },
    body: {
      at: [0, 113, 230, 238],
      text: "Твой личный менеджер напишет, проверит дату, поможет с меню и оформлением, закрепит зал за тобой.",
    },
  },
  {
    node: "914:1876",
    at: [716, 243, 271, 374],
    num: { at: [41, 0, 31], text: "03" },
    title: { at: [41, 34, 230], text: "Празднуешь", lh: 50, accent: true },
    body: {
      at: [41, 95, 230, 279],
      text: "К твоему приходу всё готово. Личный менеджер встретит тебя, проводит гостей и будет рядом, если что-то понадобится.",
    },
  },
  {
    node: "914:1872",
    at: [1055, 243, 230, 351],
    num: { at: [0, 0, 32], text: "04" },
    title: { at: [0, 34, 219], text: "Забираешь Reels", lh: 50 },
    body: {
      at: [0, 113, 230, 238],
      text: "После праздника пришлём готовый ролик — залей в сторис или оставь на память.",
    },
  },
];

/** Чек-лист первой карточки. Отметки ставятся выбором в блоках выше. */
/*
  Чек-лист выбора. Каждая строка — ссылка на свой шаг: это единственное место
  на странице, где все четыре шага видны разом, и естественное движение —
  ткнуть в незакрытый и оказаться там. Закрытые тоже кликабельны: вернуться и
  сменить выбор можно в любой момент.
*/
const CHECKS = [
  { id: "hall", label: "Зал", y: 116, href: "#halls" },
  { id: "pkg", label: "Пакет", y: 152, href: "#packages" },
  { id: "date", label: "Дата", y: 188, href: "#price" },
  { id: "sent", label: "Заявка", y: 224, href: "#contact" },
] as const;

function Marker({ done }: { done: boolean }) {
  return (
    <>
      <svg className="off" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r="8.1" fill="none" stroke="#EF9DA3" strokeWidth="1.8" />
      </svg>
      <svg className="on" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r="9" fill="var(--color-primary)" />
        <path
          d="M5 9.2 7.6 11.8 13 6.4"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}

type CheckId = (typeof CHECKS)[number]["id"];

/**
 * Телефон и планшет (ниже 1024): те же четыре карточки на прищепках, те же
 * тексты и тот же чек-лист в первой.
 *
 * Карточек по две в кадре — на всю ширину экрана; третья и четвёртая
 * доступны свайпом. Лента не по кругу: у шагов есть порядок, и у ленты есть
 * начало и конец — две страницы, «01–02» и «03–04». Это обычная прокрутка с
 * привязкой к страницам (scroll-snap): палец ведёт ленту, как в любой
 * галерее телефона, а отпущенная лента встаёт ровно на страницу. Точки под
 * лентой показывают, где ты, и листают по нажатию.
 *
 * Картинку карточки из макета по высоте не растянуть — исказятся прищепка и
 * углы, а текстам на телефоне нужна своя высота. Поэтому рамка — CSS
 * (красная у первой, приглушённая у остальных, как на десктопе), а прищепка —
 * картинка, вырезанная из той же подложки (public/figma/how/pin.webp).
 */
function HowMobile({ done }: { done: Record<CheckId, boolean> }) {
  const trackRef = useRef<HTMLOListElement>(null);
  const [page, setPage] = useState(0);

  /*
    Подсказка, что лента листается: когда лента впервые почти целиком в
    кадре, карточки один раз качаются влево и обратно (hw-nudge в mobile.css).
    Один раз за визит; не играем, если ленту уже листали или трогали, и при
    «уменьшить движение».
  */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const KEY = "mywish-how-nudged";
    const seen = () => {
      try {
        return sessionStorage.getItem(KEY) === "1";
      } catch {
        return false;
      }
    };
    const remember = () => {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {}
    };
    if (seen() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      delete track.dataset.nudge;
    };
    const touched = () => {
      remember();
      stop();
      observer.disconnect();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (track.scrollLeft > 0 || seen()) return;
        remember();
        timer = window.setTimeout(() => {
          track.dataset.nudge = "";
          timer = window.setTimeout(stop, 1250);
        }, 250);
      },
      { threshold: 0.75 },
    );
    observer.observe(track);
    track.addEventListener("pointerdown", touched, { once: true });
    return () => {
      observer.disconnect();
      stop();
      track.removeEventListener("pointerdown", touched);
    };
  }, []);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setPage(max > 0 && track.scrollLeft > max / 2 ? 1 : 0);
  };

  const goTo = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: target === 0 ? 0 : track.scrollWidth - track.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className="hw">
      <ol
        ref={trackRef}
        className="hw-track"
        onScroll={onScroll}
        aria-label="Что дальше: четыре шага"
      >
        {STEPS.map((s, i) => (
          <li key={s.node} className="hw-card" data-active={i === 0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="hw-pin"
              src="/figma/how/pin.webp"
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <span className="hw-num" aria-hidden>
              {s.num.text}
            </span>
            <h3 className="hw-title" data-accent={s.title.accent === true}>
              {s.title.text}
            </h3>
            {s.body ? <p className="hw-text">{s.body.text}</p> : null}

            {i === 0 ? (
              <ul className="hw-checks">
                {CHECKS.map((c) => (
                  <li key={c.id}>
                    <a href={c.href} className="u-step hw-check" data-done={done[c.id]}>
                      <span aria-hidden className="u-check hw-mark">
                        <Marker done={done[c.id]} />
                      </span>
                      {c.label}
                      <span className="u-visually-hidden">
                        {done[c.id] ? " — готово, перейти" : " — ещё не готово, перейти"}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="hm-dots hw-dots">
        {["Шаги 1–2", "Шаги 3–4"].map((label, p) => (
          <button
            key={label}
            type="button"
            className="hw-dot"
            aria-label={label}
            aria-current={page === p || undefined}
            onClick={() => goTo(p)}
          >
            <span data-on={page === p} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const order = useOrder();

  const done: Record<CheckId, boolean> = {
    hall: order.hall !== "",
    pkg: order.pkgTouched,
    date: order.dateTouched,
    sent: order.sent,
  };

  return (
    <section id="how" data-section="how" style={box(0, 6894, 1440, 617)}>
      {/* Карточки на прищепках 914:1866 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/how/backdrop.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="max-w-none"
        style={box(46, 68, 1348, 510)}
      />

      <SectionHeading
        size="l"
        node="914:1865"
        at={[554, 0, 331, 50]}
        accent=""
        className="h-50"
      >
        Что дальше?
      </SectionHeading>

      <p className="u-lede" data-node-id="914:1867" style={box(442, 68, 555, 28)}>
        Дальше мы согласуем детали, а ты просто празднуешь.
      </p>

      <ol className="contents">
        {STEPS.map((s) => (
          <li key={s.node} data-node-id={s.node} style={box(...s.at)}>
            <span
              aria-hidden
              className="font-display font-black text-primary"
              style={{
                ...box(...s.num.at),
                fontSize: px(30),
                lineHeight: px(50),
              }}
            >
              {s.num.text}
            </span>
            <h3
              className={`font-display font-black ${
                s.title.accent ? "text-primary" : "text-ink"
              }`}
              style={{
                ...box(...s.title.at),
                fontSize: px(30),
                lineHeight: px(s.title.lh),
              }}
            >
              {s.title.text}
            </h3>

            {s.body ? (
              <p
                className="font-sans font-semibold text-ink"
                style={{
                  ...box(...s.body.at),
                  fontSize: px(19),
                  lineHeight: px(28),
                }}
              >
                {s.body.text}
              </p>
            ) : null}

            {/* Чек-лист — только у первой карточки */}
            {s.node === "914:1880"
              ? CHECKS.map((c) => (
                  <a
                    key={c.id}
                    href={c.href}
                    className="u-step font-sans font-semibold"
                    data-done={done[c.id]}
                    style={{
                      ...box(21, c.y, 192, 28),
                      fontSize: px(19),
                      lineHeight: px(28),
                    }}
                  >
                    <span
                      aria-hidden
                      className="u-check"
                      style={box(-21, 5, 18, 18)}
                    >
                      <Marker done={done[c.id]} />
                    </span>
                    {c.label}
                    <span className="u-visually-hidden">
                      {done[c.id] ? " — готово, перейти" : " — ещё не готово, перейти"}
                    </span>
                  </a>
                ))
              : null}
          </li>
        ))}
      </ol>

      {/* Ниже 1024 — карточки лентой, по две в кадре. */}
      <HowMobile done={done} />
    </section>
  );
}
