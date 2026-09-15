"use client";
import { useBackgroundVideo } from "@/lib/useBackgroundVideo";
import { enableHeroRunway } from "@/lib/heroRunway";

import { useEffect, useRef, useState } from "react";
import { box, px } from "@/lib/px";
import SiteHeader from "./SiteHeader";

/**
 * Секция 1 «hero» — Figma 914:1023 (1440 × 956).
 *
 * Отличие от макета осознанное: в Figma это фрейм фиксированной высоты,
 * на сайте — полный экран (100svh) с фоновым видео. Поэтому по вертикали
 * блоки не копируются координатами, а привязаны к краям:
 *   • шапка         — сверху (37px макета)
 *   • заголовок     — по центру (в макете блок 296…657 при высоте 956,
 *                     его центр 476.5 против центра кадра 478 — то есть центр)
 *   • регалии       — снизу (88px макета)
 * По горизонтали всё ровно на координатах макета внутри сцены 1440.
 *
 * Видео: интро (hero1080) проигрывается один раз и передаёт эстафету лупу
 * (loop1080-24). Последний кадр интро совпадает с кадром лупа, поэтому
 * подмена мгновенная, без затухания: луп лежит слоем ниже и уже играет к
 * моменту, когда интро скрывается. При prefers-reduced-motion остаётся постер.
 */

const VEIL =
  "linear-gradient(90deg, rgba(252,225,227,0.7) 0%, rgba(252,225,227,0.45) 24.774%, rgba(252,225,227,0.12) 47.566%, rgba(252,225,227,0) 67.385%)";

/** Обводка, тень и размытие кнопок hero: блок вставлен в макет в масштабе 2.545. */
const CTA_HERO: React.CSSProperties = {
  borderWidth: "0.0681rem",
  boxShadow: "0 1.0925rem 3.0719rem rgba(28,17,23,0.24)",
  backdropFilter: "blur(1.2288rem)",
};

type Line = { text: string; className?: string; flash?: boolean };

/** Заголовок 914:1027 и подзаголовок 914:1026 печатаются по букве. */
const HEADING: Line[] = [
  { text: "ЖЕНСКИЕ" },
  { text: "ПРАЗДНИКИ", className: "text-primary", flash: true },
  { text: "В САНКТ-ПЕТЕРБУРГЕ" },
];
const LEDE: Line[] = [
  { text: "Твой вишлист уже собран в праздник." },
  { text: "Не хватает только тебя!" },
];

/*
  Верхняя панель выезжает почти сразу: занавес уходит за 300мс, и панель
  подхватывает его хвост. Раньше она ждала 2с — первый экран это время стоял
  пустым, хотя ролик уже шёл.
*/
const HEADER_AT = 360;

/*
  Раскрытие левого блока и розовой заливки.

  Раньше момент был привязан к хлопку героя в ролике: 7.03с руки сходятся,
  8.02с разводит обратно, и всё, что появляется слева, должно было уложиться
  в это окно — отсюда быстрая печать и кнопки, стартующие поверх подзаголовка.
  Теперь раскрытие перенесено на 4.08с по просьбе заказчика. Опорного события
  в кадре там нет — камера просто едет, — поэтому попадать в него до кадра не
  требуется; внутренние доли сценария оставлены прежними.
*/
const REVEAL_AT = 4080;

/*
  Телефон (ниже 1024). Роликов нет — на их месте фото, и ждать загрузки
  нечего. Сценарий тот же, но без занавеса и почти сразу: шапка через 80мс,
  левый блок с печатью через 250мс.
*/
const MOBILE_QUERY = "(max-width: 1023.98px)";
/** Телефон (до 767) — на фоне зацикленный ролик; планшет остаётся с фото. */
const PHONE_QUERY = "(max-width: 767.98px)";
const MOBILE_HEADER_AT = 80;
const MOBILE_REVEAL_AT = 250;

/**
 * Медленный наезд кадра. Выключен: исходник в 24 кадра/с, и непрерывное
 * движение делает видимым чередование 3:2 — картинка начинает подрагивать.
 * Чтобы вернуть, поставьте true и пересоберите ролик с интерполяцией до 48–60.
 */
const ZOOM = false;
const HEADING_STEP = 12;
const LEDE_STEP = 6;
const chars = (lines: Line[]) => lines.reduce((n, l) => n + l.text.length, 0);
/** Подзаголовок идёт сразу за заголовком, кнопки подхватывают его хвост. */
const LEDE_START = chars(HEADING) * HEADING_STEP + 20;
const POP_START = 620;

/**
 * Печать по букве. Каждый символ — свой span с порядковым номером,
 * задержка считается в CSS: start + номер × шаг. Анимация вместо таймеров,
 * чтобы печать не спотыкалась, пока страница догружает видео.
 *
 * Для скринридеров текст продублирован рядом обычной строкой,
 * а сами буквы скрыты через aria-hidden — иначе их прочитают по одной.
 */
function Typed({
  lines,
  start,
  step,
}: {
  lines: Line[];
  start: number;
  step: number;
}) {
  let i = 0;
  return (
    <span
      className="hero-type"
      aria-hidden
      style={
        {
          "--start": `${start}ms`,
          "--step": `${step}ms`,
        } as React.CSSProperties
      }
    >
      {lines.map((line, li) => {
        /** Момент, когда строка допечаталась — для «клевка» акцентного слова. */
        const doneAt = start + (i + line.text.length) * step;
        return (
          <span key={li}>
            {li > 0 ? <br /> : null}
            <span
              className={[line.className, line.flash ? "hero-flash" : ""]
                .filter(Boolean)
                .join(" ")}
              style={
                line.flash
                  ? ({ "--at": `${doneAt}ms` } as React.CSSProperties)
                  : undefined
              }
            >
              {Array.from(line.text).map((ch, ci) => (
                <span
                  key={ci}
                  data-ch
                  style={{ "--i": i++ } as React.CSSProperties}
                >
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default function Hero() {
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [loopVisible, setLoopVisible] = useState(false);
  /** Ролик телефона и признак, что он реально пошёл (до этого виден постер). */
  const phoneVideoRef = useRef<HTMLVideoElement>(null);
  const [phoneVideoOn, setPhoneVideoOn] = useState(false);
  /**
   * Сценарий первого экрана:
   *   0 — чёрный экран, видео грузится
   *   1 — затемнение уходит за 0.3с, видео играет в чистом виде
   *   2 — почти сразу (0.36с) выезжает верхняя панель
   *   3 — на 4.08с появляются левый блок, розовая вуаль и растворение внизу
   */
  const [phase, setPhase] = useState(0);
  /* Кнопки паузы на первом экране нет по просьбе заказчика: фон играет всегда. */
  useBackgroundVideo(introRef, !loopVisible);
  useBackgroundVideo(loopRef, loopVisible);
  useBackgroundVideo(phoneVideoRef, true);
  /** Ref, а не state — читаем из обработчиков событий, которые ставятся один раз. */
  const onLoopRef = useRef(false);

  /** Интро доиграло: запускаем луп и скрываем интро, когда луп реально пошёл. */
  const handoff = () => {
    onLoopRef.current = true;
    const v = loopRef.current;
    if (!v) return setLoopVisible(true);
    const show = () => setLoopVisible(true);
    if (document.hidden) show(); else v.play().then(show, show);
  };

  /**
   * Отсчёт ведём от момента, когда видео реально пошло, — тогда затемнение
   * скрывает загрузку, а не съедает секунды сценария. Если запуск почему-то
   * не случился, стартуем через 0.6с, чтобы страница не осталась чёрной.
   */
  useEffect(() => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      const timers = [
        window.setTimeout(() => setPhase(1), 0),
        window.setTimeout(() => setPhase(2), MOBILE_HEADER_AT),
        window.setTimeout(() => setPhase(3), MOBILE_REVEAL_AT),
      ];

      /*
        Ролик телефона. Сценарий его не ждёт: под ним постер — тот же первый
        кадр, — поэтому текст выходит сразу, а видео проявляется, когда пошло.
        Браузеры ставят фоновое видео на паузу (свернули вкладку, режим
        энергосбережения) — возвращаем на первом удобном событии.
      */

      /* iPhone: верх кадра — под часами, см. lib/heroRunway.ts. */
      const disableRunway = enableHeroRunway();
      return () => {
        timers.forEach((t) => window.clearTimeout(t));
        disableRunway();
      };
    }

    const intro = introRef.current;
    let started = false;
    const timers: number[] = [];
    const start = () => {
      if (started) return;
      started = true;
      setPhase(1);
      timers.push(window.setTimeout(() => setPhase(2), HEADER_AT));
      timers.push(window.setTimeout(() => setPhase(3), REVEAL_AT));
    };
    intro?.addEventListener("playing", start, { once: true });
    timers.push(window.setTimeout(start, 600));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      intro?.removeEventListener("playing", start);
    };
  }, []);

  useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;
    const warm = () => {
      if (intro.duration - intro.currentTime < 3 && loop.preload === "none") { loop.preload = "auto"; loop.load(); }
    };
    intro.addEventListener("timeupdate", warm);
    return () => intro.removeEventListener("timeupdate", warm);
  }, []);

  return (
    <section
      id="hero"
      data-section="hero"
      data-node-id="914:1023"
      className="relative h-svh min-h-[560px] overflow-hidden bg-page"
    >
      {/* ── Фон: постер → интро → бесконечный луп ─────────────── */}
      <div aria-hidden className="absolute inset-0">
        {/* Кадр медленно доезжает с 1.06 до 1.0 ровно за 7 секунд сценария */}
        <div
          className="hero-zoom absolute inset-0"
          data-zoom={ZOOM}
          data-shown={phase >= 1}
        >
          {/* Постер ролика нужен только десктопу: телефону — пустой пиксель. */}
          <picture>
            <source
              media="(max-width: 1023.98px)"
              srcSet="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            />
            { }
            <img
              src="/video/hero-poster.webp"
              alt=""
              className="absolute inset-0 size-full object-cover"
              style={{ visibility: phase >= 1 ? "hidden" : "visible" }}
            />
          </picture>
          <video
            ref={loopRef}
            className="hero-video absolute inset-0 size-full object-cover"
            loop
            muted
            playsInline
            preload="none"
            onPlaying={() => setLoopVisible(true)}
          >
            <source src="/video/hero-loop.mp4" type="video/mp4" />
            <source src="/video/hero-loop.webm" type="video/webm" />
          </video>
          <video
            ref={introRef}
            className="hero-video absolute inset-0 size-full object-cover"
            style={{ opacity: loopVisible ? 0 : 1 }}
            muted
            playsInline
            preload="none"
            onEnded={handoff}
          >
            <source src="/video/hero-intro.mp4" type="video/mp4" />
            <source src="/video/hero-intro.webm" type="video/webm" />
          </video>
        </div>
        {/*
          Растворение нижнего края кадра в цвет страницы: без него на прокрутке
          виден резкий шов между видео и розовым фоном сцены.

          Приходит не сразу, а вместе с боковой заливкой — на 4.08с: обе
          розовые, и появляться им врозь незачем. См. .hero-seam.
        */}
        <div className="hero-seam" aria-hidden data-shown={phase >= 3} />

        {/*
          Фон ниже 1024 (см. mobile.css):
            до 767      — первый кадр ролика как постер, поверх — сам ролик;
            768…1023    — вертикальное фото (hero-mobile);
            от 1024     — пустой пиксель: скрытая картинка всё равно
                          скачалась бы, а так браузер берёт заглушку.
        */}
        <picture className="hero-mobile-photo">
          <source
            media="(min-width: 1024px)"
            srcSet="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          />
          <source
            media="(max-width: 767.98px)"
            srcSet="/figma/1-hero/hero-mobile-video-poster.webp?v=720"
          />
          { }
          <img
            src="/figma/1-hero/hero-mobile.webp"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover"
          />
        </picture>

        {/*
          Зацикленный ролик телефона. preload="none": грузит и запускает его
          скрипт, и только до 767 — планшет и десктоп его не качают. Последний
          кадр исходника совпадал с первым и при повторе давал заминку, поэтому
          в веб-версии он срезан (см. README). ?v= — версия ролика: файл
          заменён под тем же именем, и без метки браузер показал бы старый из кэша.
        */}
        <video
          ref={phoneVideoRef}
          className="hero-mobile-video"
          data-playing={phoneVideoOn}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          onPlaying={() => setPhoneVideoOn(true)}
        >
          <source src="/video/hero-mobile-loop.mp4?v=720" type="video/mp4" />
          <source src="/video/hero-mobile-loop.webm?v=720" type="video/webm" />
        </video>

        {/*
          Градиент под текст телефона (до 767): верх кадра чистый — лицо,
          корона и бокал без пелены, — к низу плотнеет в светло-розовый.
          Отдельным слоем, а не вуалью выше: вуаль выезжает анимацией, а этот
          слой — часть композиции кадра и стоит с самого начала.
        */}
        <div className="hero-mobile-shade" aria-hidden />

        {/* 914:1025 — розовая вуаль, выезжает слева направо на 7-й секунде */}
        <div
          className="hero-veil absolute inset-0"
          data-shown={phase >= 3}
          style={{ backgroundImage: VEIL }}
        />
        {/* Затемнение на старте: прячет загрузку первого кадра */}
        <div
          className="hero-curtain absolute inset-0 bg-black"
          data-shown={phase >= 1}
        />
      </div>

      <div className="stage h-full">
        {/* Шапка — общая для всех страниц, здесь с выездом сверху. */}
        <SiteHeader animated shown={phase >= 2} />

        {/* ── Левый блок: появляется на 7-й секунде ──────────── */}
        <div
          className="hero-gate hero-interface-layer absolute inset-0"
          data-shown={phase >= 3}
        >
          <div
            className="absolute left-131 top-1/2 w-780"
            style={{ transform: "translateY(calc(-50% - 0.1rem))" }}
          >
            {/* 914:1027 — печатается по букве */}
            <h1 className="font-display text-hero font-black tracking-[0.04em] text-ink">
              <span className="u-visually-hidden">
                ЖЕНСКИЕ ПРАЗДНИКИ В САНКТ-ПЕТЕРБУРГЕ
              </span>
              <Typed lines={HEADING} start={0} step={HEADING_STEP} />
            </h1>

            {/* 914:1026 — допечатывается следом */}
            <p className="mt-19 font-sans text-hero-lede font-medium tracking-[0.04em] text-ink">
              <span className="u-visually-hidden">
                Твой вишлист уже собран в праздник. Не хватает только тебя!
              </span>
              <Typed lines={LEDE} start={LEDE_START} step={LEDE_STEP} />
            </p>

            {/* 914:1130 / 914:1132 — всплывают, когда текст допечатан */}
            <div className="mt-51 flex items-center gap-13">
              <span
                className="hero-pop inline-flex"
                style={{ "--delay": `${POP_START}ms` } as React.CSSProperties}
              >
                <a
                  href="#contact"
                  className="u-cta h-41 w-193 text-btn transition-[transform,background-color,color,box-shadow] duration-200 hover:-translate-y-2 hover:bg-navy hover:text-surface"
                  style={CTA_HERO}
                >
                  СВЯЗАТЬСЯ
                </a>
              </span>
              <span
                className="hero-pop inline-flex"
                style={
                  { "--delay": `${POP_START + 80}ms` } as React.CSSProperties
                }
              >
                <a
                  href="#halls"
                  data-hero-halls-trigger
                  className="u-cta h-41 w-136 bg-[rgba(255,241,242,0.63)] text-btn font-normal text-ink-secondary transition-[transform,background-color,color,box-shadow] duration-200 hover:-translate-y-2 hover:bg-blush hover:text-primary"
                  style={CTA_HERO}
                >
                  Выбрать зал
                </a>
              </span>
            </div>
          </div>

          {/*
            Плашки «5.0 Яндекс.Карты» и «Хорошее место 2026» (914:1128 / 914:1127)
            временно сняты по просьбе заказчика. Возвращаются на bottom-88 left-131.
          */}
        </div>
      </div>
    </section>
  );
}
