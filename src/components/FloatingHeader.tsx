"use client";

import { useEffect, useRef, useState } from "react";
import { box } from "@/lib/px";
import { CONTACTS } from "@/lib/contacts";
import HeaderHome from "./HeaderHome";
import MobileFloatingHeader from "./MobileFloatingHeader";

/* С абсолютным путём пункты работают и со страницы залов, и на главной. */
const NAV = [
  { href: "/#halls", label: "Залы" },
  { href: "/#packages", label: "Пакеты" },
  { href: "/#price", label: "Цены" },
  { href: "/#contact", label: "Заявка" },
];

const CTA_HEADER: React.CSSProperties = {
  borderWidth: "0.0681rem",
  boxShadow: "0 1.0925rem 3.0719rem rgba(28,17,23,0.24)",
  backdropFilter: "blur(1.2288rem)",
};

/**
 * Полоса, по которой определяется тёмный фон, — строка логотипа (макет 20…89
 * от верха шапки). Меряем именно по ней, а не по всей высоте шапки: пропадает
 * на синем логотип, он и должен решать. Считать по всей шапке было хуже — она
 * на 39px выше логотипа, и переключение случалось, когда верх логотипа ещё
 * оставался на светлом.
 */
const LOGO_TOP = 20;
const LOGO_BOTTOM = 89;

/** Высота полосы шапки в макетных px (6.75rem). */
const HEADER_HEIGHT = 108;

/**
 * Доля полосы логотипа на тёмном фоне, при которой берём светлую схему.
 *
 * Правило простое: логотип белеет, когда лежит на тёмном целиком. Порог у
 * самой единицы, а не посередине, потому что переключение всё равно попадает
 * на край полосы, и ошибиться можно только в одну из двух сторон: белый
 * логотип на светлом или тёмный на тёмном — в обоих случаях его не видно.
 * При «целиком» промах остаётся в пределах пары пикселей на обеих границах,
 * при половине — доходил до трети высоты знака.
 *
 * Порога два, чтобы на самой границе не мигало, если прокрутку остановить
 * ровно на ней; зазор между ними — около 6px хода.
 */
const DARK_ON = 0.97;
const DARK_OFF = 0.88;

/**
 * Передача шапки первому экрану.
 *
 * Статическая шапка hero стоит на 37 макетных px от верха страницы, плавающая —
 * на 20 от верха окна. Разница 17 одинаковая у всех элементов: логотип 37/20,
 * меню 52/35, соцсети и кнопка 51/34.
 *
 * Поэтому последние 17 × масштаб пикселей хода плавающая шапка не стоит на
 * месте, а едет вниз вместе со страницей — ровно по той траектории, по которой
 * приезжает шапка hero. В самом низу, на прокрутке 0, она оказывается точно на
 * её месте, и там происходит подмена.
 *
 * Подмена именно на нуле, а не на 17 × масштаб (где шапки тоже совпадают),
 * из-за колеса мыши: оно прокручивает шагами примерно по 100px и в
 * произвольную точку не попадает — а в ноль попадает всегда, потому что там
 * прокрутка упирается в край страницы. Значит стык каждый раз пиксель в пиксель.
 */
const HERO_HEADER_Y = 37;
const FLOAT_HEADER_Y = 20;

/**
 * Шапку вызывает курсор, а не прокрутка.
 *
 * Прокрутка вверх — движение частое и невольное: шапка выскакивала, когда её
 * никто не звал, и загораживала то, к чему человек только что вернулся.
 * Наведение в верхнюю полосу экрана — жест намеренный: туда тянутся именно за
 * меню. Увёл курсор вниз — шапка ушла.
 *
 * HOT — высота полосы вызова, чуть больше самой шапки. COLD — граница ухода;
 * она ниже полосы вызова, чтобы у края шапка не мигала от дрожания руки.
 *
 * LEAVE — задержка перед уходом: пересечь пустое место между пунктами меню,
 * не потеряв шапку, нужно успевать.
 *
 * QUIET — тишина после перехода по ссылке: курсор в этот момент как раз в
 * верхней полосе, а страница уезжает к блоку, и шапка загораживала бы его
 * заголовок.
 *
 * На тачскрине наведения нет — там остаётся прежнее правило: шапку зовёт
 * намеренная прокрутка вверх, случайные несколько пикселей её не трогают.
 */
const HOT = 120;
const COLD = 190;
const LEAVE = 320;
const QUIET = 1400;
const UP_TO_SHOW = 90;
const DOWN_TO_HIDE = 12;

/** Desktop header that follows reading direction without reacting to jitter. */
export default function FloatingHeader() {
  const [visible, setVisible] = useState(false);
  const [over, setOver] = useState<"light" | "dark" | "hero">("hero");
  const visibleRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  const overRef = useRef<"light" | "dark" | "hero">("hero");

  useEffect(() => {
    let frame = 0;
    let lastY = window.scrollY;
    let direction = 0;
    let distanceInDirection = 0;

    const darkZones = Array.from(
      document.querySelectorAll<HTMLElement>("[data-header-backdrop='dark']"),
    );

    /* Первый экран есть на обеих страницах — ищем по признаку, не по id. */
    const heroScene = document.querySelector<HTMLElement>("[data-page-hero]");

    /*
      Пока плавающая шапка на экране, статическая в hero спрятана — иначе в
      полосе, где шапка hero ещё не ушла за верхний край (первые ~100px хода),
      на экране оказались бы две одинаковые шапки внахлёст. Разводит их этот
      признак на <html>, его читает CSS.
    */
    const commitVisibility = (next: boolean) => {
      if (visibleRef.current === next) return;
      visibleRef.current = next;
      document.documentElement.dataset.headerOwner = next ? "floating" : "hero";
      setVisible(next);
    };

    const commitOver = (next: "light" | "dark" | "hero") => {
      if (overRef.current === next) return;
      overRef.current = next;
      setOver(next);
    };

    /*
      Какая часть полосы логотипа лежит на тёмном фоне. Считаем пересечение по
      вертикали: тёмные зоны тянутся во всю ширину сцены, поэтому по горизонтали
      проверять нечего.

      Полоса считается от верха окна по макетным координатам, а не берётся из
      getBoundingClientRect самой шапки: спрятанная шапка сдвинута за верхний
      край, и её собственный прямоугольник показал бы не тот кусок страницы.
      Тогда при появлении она приезжала бы уже в неправильной схеме.
    */
    const measureBackdrop = (scale: number) => {
      /*
        Пока шапка стоит на первом экране, она носит прозрачные плашки hero:
        к моменту подмены её вид должен совпасть с видом статической шапки,
        иначе стык выдаст себя сменой плотности пилюль.
      */
      const band = HEADER_HEIGHT * scale;
      if (heroScene && heroScene.getBoundingClientRect().bottom > band) {
        commitOver("hero");
        return;
      }
      if (!darkZones.length) {
        commitOver("light");
        return;
      }

      const top = LOGO_TOP * scale;
      const bottom = LOGO_BOTTOM * scale;

      let covered = 0;
      for (const zone of darkZones) {
        const rect = zone.getBoundingClientRect();
        covered += Math.max(
          0,
          Math.min(bottom, rect.bottom) - Math.max(top, rect.top),
        );
      }

      const ratio = covered / (bottom - top);
      const dark =
        overRef.current === "dark" ? ratio >= DARK_OFF : ratio >= DARK_ON;
      commitOver(dark ? "dark" : "light");
    };

    const measure = () => {
      frame = 0;
      const scale =
        parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
      measureBackdrop(scale);
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      /*
        Последние 17 макетных px шапка едет вниз вместе со страницей, повторяя
        траекторию статической. Пишем смещение переменной и на это время снимаем
        переход по transform: он рассчитан на выезд шапки, а здесь позицию ведёт
        прокрутка, и 260мс сглаживания превратились бы в отставание.
      */
      const dock = Math.max(
        0,
        (HERO_HEADER_Y - FLOAT_HEADER_Y) * scale - currentY,
      );
      const header = headerRef.current;
      if (header) {
        header.style.setProperty("--dock", `${dock}px`);
        header.dataset.docking = dock > 0 ? "true" : "false";
      }

      if (currentY <= 0) {
        commitVisibility(false);
        direction = 0;
        distanceInDirection = 0;
        lastY = currentY;
        return;
      }

      if (Math.abs(delta) < 1) return;

      const nextDirection = delta > 0 ? 1 : -1;
      if (nextDirection !== direction) {
        direction = nextDirection;
        distanceInDirection = 0;
      }
      distanceInDirection += Math.abs(delta);

      /*
        С курсором шапку зовёт только наведение. Прокрутка при этом всё равно
        может её убрать: уехали вниз — значит меню больше не нужно.
      */
      {
        if (direction < 0 && distanceInDirection >= UP_TO_SHOW && !quietUntil()) {
          commitVisibility(true);
        } else if (direction > 0 && distanceInDirection >= DOWN_TO_HIDE) {
          commitVisibility(false);
        }
      }

      lastY = currentY;
    };

    /*
      Тишина после перехода по якорю. Держим момент, до которого шапку не
      показываем: сам переход к блоку выше — это движение вверх, и без окна
      тишины шапка выезжала бы поверх заголовка, к которому только что привели.
    */
    let quietTill = 0;
    const quietUntil = () => performance.now() < quietTill;
    const hush = () => {
      quietTill = performance.now() + QUIET;
      commitVisibility(false);
    };

    const курсорЕсть = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /*
      Курсор в верхней полосе. Порог ухода ниже порога вызова: у самой границы
      иначе получается мигание — рука дрожит на пару пикселей, шапка то есть,
      то нет.
    */
    let leaving = 0;
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const scale =
        parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
      const y = event.clientY;
      if (y <= HOT * scale) {
        window.clearTimeout(leaving);
        if (!quietUntil() && window.scrollY > 0) commitVisibility(true);
        return;
      }
      if (y > COLD * scale && visibleRef.current && !leaving) {
        leaving = window.setTimeout(() => {
          leaving = 0;
          commitVisibility(false);
        }, LEAVE);
      }
    };
    if (курсорЕсть) window.addEventListener("pointermove", onPointer, { passive: true });

    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    /*
      Переход по ссылке внутри страницы. Слушаем и нажатие, и смену хеша:
      нажатие ловит переход на тот же якорь (хеш при этом не меняется, события
      нет), а hashchange — переходы из адресной строки и по «назад».
    */
    const onAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("a");
      const href = link?.getAttribute("href") ?? "";
      if (href.startsWith("#") || href.startsWith("/#")) hush();
    };
    document.addEventListener("click", onAnchorClick, true);
    window.addEventListener("hashchange", hush);

    /* Страница могла открыться уже прокрученной — например по якорю. */
    scheduleMeasure();
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(leaving);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("click", onAnchorClick, true);
      window.removeEventListener("hashchange", hush);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      delete document.documentElement.dataset.headerOwner;
    };
  }, []);

  return (
    <>
    {/* Ниже 1024 — своя плавающая шапка: выезжает при прокрутке вверх. */}
    <MobileFloatingHeader />
    <header
      ref={headerRef}
      className="floating-site-header"
      data-visible={visible}
      data-over={over}
      aria-hidden={!visible}
      inert={!visible}
    >
      {/*
        Подложка идёт до .stage, поэтому лежит под содержимым: обе коробки
        позиционированы, и порядок в разметке решает, кто выше.
      */}
      <div className="floating-header-scrim" aria-hidden />

      <div className="stage relative h-full">
        <span className="absolute" style={box(131, 20, 171, 69)}>
          <HeaderHome floating />
        </span>

        <span className="absolute" style={box(477, 35, 397, 39)}>
          {/*
            Заливка и обводка — в CSS, а не инлайном: у варианта «над первым
            экраном» они другие (прозрачнее, как в шапке hero), а инлайн-стиль
            перекрыть нечем.
          */}
          <nav
            aria-label="Навигация по странице"
            className="floating-header-nav relative grid size-full grid-cols-4 rounded-pill"
          >
            <span
              aria-hidden
              className="floating-header-nav-ring pointer-events-none absolute rounded-pill"
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
        </span>

        <span className="absolute" style={box(1010, 34, 41, 41)}>
          <a
            href={CONTACTS.telegram}
            aria-label="Telegram MyWish"
            className="floating-header-chip group flex size-full items-center justify-center rounded-pill border-[0.0675rem] border-[rgba(255,255,255,0.62)] transition-[transform,background-color,color,border-color,box-shadow] duration-200 hover:-translate-y-2 hover:border-primary hover:shadow-[0_0.375rem_0.875rem_rgba(28,17,23,0.22)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/1-hero/icon-telegram.svg"
              alt=""
              aria-hidden
              className="size-21 transition-transform duration-200 group-hover:scale-110"
            />
          </a>
        </span>

        <span className="absolute" style={box(1058, 34, 41, 41)}>
          <a
            href={CONTACTS.max}
            aria-label="MAX MyWish"
            className="floating-header-chip group flex size-full items-center justify-center rounded-pill border-[0.0675rem] border-[rgba(255,255,255,0.62)] transition-[transform,background-color,color,border-color,box-shadow] duration-200 hover:-translate-y-2 hover:border-primary hover:shadow-[0_0.375rem_0.875rem_rgba(28,17,23,0.22)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/1-hero/icon-max.svg"
              alt=""
              aria-hidden
              className="size-21 rounded-sm transition-transform duration-200 group-hover:scale-110"
            />
          </a>
        </span>

        {/*
          Телефон вместо «СВЯЗАТЬСЯ». Правый край пилюли остаётся на 1312 —
          там же, где был у кнопки, — а растёт она влево: номер шире надписи
          (163 против 99 макетных px при том же кегле), поля по 17 сохранены,
          отсюда ширина 198. Telegram и MAX сдвинуты влево на те же 65, чтобы
          зазоры между элементами остались прежними (7 и 15).
        */}
        <span className="absolute" style={box(1114, 34, 198, 41)}>
          <a
            href={CONTACTS.phone.href}
            className="u-cta u-header-phone size-full whitespace-nowrap text-btn"
            style={CTA_HEADER}
          >
            {CONTACTS.phone.label}
          </a>
        </span>
      </div>
    </header>
    </>
  );
}
