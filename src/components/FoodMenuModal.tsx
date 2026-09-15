"use client";

import Image from "next/image";
import { MENU } from "@/lib/menu";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/useHydrated";

export type FoodSetItem = {
  name: string;
  price: string;
  image: string;
  /**
   * Сколько таких в наборе. Больше одного бывает редко — у «Вау» на столе два
   * одинаковых бокса салатов. Отдельной плашкой это выглядело бы ошибкой
   * вёрстки: две одинаковые картинки рядом читаются как дубль, а не как две
   * порции. Поэтому пометка внутри позиции.
   */
  count?: number;
};

/** Страниц в полном меню: обложка и шесть разворотов. */
const PAGES = 7;
/** Пропорции страницы меню (высота / ширина). */
const PAGE_RATIO = 842 / 595;

/**
 * Телефон (до 700). Полное меню там — отдельная раскладка, а не десктопная
 * карусель: та ставит страницу шире окна, соседние страницы уводит за экран,
 * и листать было нечем, а мелкий текст меню — не увеличить.
 */
const PHONE = "(max-width: 700px)";

/** Во сколько раз увеличивается страница меню на телефоне. */
const ZOOM = 2.2;

/**
 * Телефон: лента страниц по кругу. По краям копии — перед обложкой последняя
 * страница, после последней обложка. Лента, остановившись на копии, без
 * анимации встаёт на настоящую страницу. Позиция в ленте на единицу больше
 * номера страницы.
 */
const STRIP = [PAGES - 1, ...Array.from({ length: PAGES }, (_, i) => i), 0];

const pageSrc = (page: number) =>
  `/packages/food/menu/page-${String(page).padStart(2, "0")}.webp`;
const pageAlt = (page: number) =>
  page === 0 ? "Обложка меню MyWish" : `Страница ${page} полного меню MyWish`;
const pageLabel = (page: number) => (page === 0 ? "Обложка" : `${page} / 6`);

/** Полное меню одним файлом — собирает scripts/build-menu-pdf.mjs. */
const MENU_PDF = "/packages/food/menu/mywish-menu.pdf";

export default function FoodMenuModal({
  packageName,
  deposit,
  tableImage,
  items,
}: {
  packageName: string;
  deposit: string;
  tableImage: string;
  items: FoodSetItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const settleTimer = useRef(0);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"set" | "menu">("set");
  const [menuPage, setMenuPage] = useState(1);
  const [phone, setPhone] = useState(false);
  const [zoom, setZoom] = useState(false);
  /* Портал возможен только в браузере: document на сервере нет. */
  const mounted = useHydrated();

  useEffect(() => {
    const media = window.matchMedia(PHONE);
    const update = () => setPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        /*
          Страховка: если модальный режим не открылся, показываем окно
          обычным — globals.css ставит его поверх страницы
          (.u-food-modal[open]:not(:modal)).
        */
        try {
          dialog.show();
        } catch {
          dialog.setAttribute("open", "");
        }
      }
      document.documentElement.classList.add("food-modal-open");
    }
    if (!open && dialog.open) dialog.close();

    return () => document.documentElement.classList.remove("food-modal-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      document.documentElement.classList.remove("food-modal-open");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const scrollToPos = (pos: number, smooth: boolean) => {
    const strip = stripRef.current;
    strip?.scrollTo({
      left: pos * strip.clientWidth,
      behavior: smooth ? "smooth" : "instant",
    });
  };

  /*
    Телефон: размер окна меню. Ширина — почти весь экран (mobile в
    globals.css), высота страницы — по её пропорциям, но не больше, чем
    помещается в экран вместе с шапкой, вкладками и панелью. Шапку и панель
    меряем, а не угадываем: у разных телефонов разные шрифты и safe-area.
    Результат — переменная --menu-page-h, окно подгоняется под неё и стоит
    по центру без пустых полос над и под страницей.
  */
  useEffect(() => {
    if (!open || !phone || view !== "menu") return;
    const dialog = dialogRef.current;
    const strip = stripRef.current;
    if (!dialog || !strip) return;
    const measure = () => {
      const chrome = [".u-food-head", ".u-food-tabs", ".u-food-strip-bar"]
        .map((s) => dialog.querySelector<HTMLElement>(s)?.offsetHeight ?? 0)
        .reduce((a, b) => a + b, 0);
      const page = strip.querySelector<HTMLElement>(".u-food-strip-page");
      const padY = page
        ? parseFloat(getComputedStyle(page).paddingTop) +
          parseFloat(getComputedStyle(page).paddingBottom)
        : 0;
      const padX = page
        ? parseFloat(getComputedStyle(page).paddingLeft) +
          parseFloat(getComputedStyle(page).paddingRight)
        : 0;
      /* 12px — зазоры окна сверху и снизу (max-height: 100dvh − 0.75rem). */
      const byWidth = (strip.clientWidth - padX) * PAGE_RATIO;
      const byHeight = window.innerHeight - 12 - chrome - padY;
      dialog.style.setProperty(
        "--menu-page-h",
        `${Math.floor(Math.min(byWidth, byHeight))}px`,
      );
      scrollToPos(menuPage + 1, false);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // Страницу при входе и повороте берём текущую; дальше её ведёт лента.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone, view]);

  const close = () => {
    setOpen(false);
    setZoom(false);
    document.documentElement.classList.remove("food-modal-open");
  };

  /** Момент открытия — чтобы клик, догоняющий касание, не закрыл окно сразу. */
  const openedAt = useRef(0);
  /** Касание кнопки: где началось — отличить нажатие от прокрутки ленты. */
  const tapStart = useRef<{ x: number; y: number } | null>(null);

  const openMenu = () => {
    if (!open) openedAt.current = performance.now();
    setView("set");
    setMenuPage(1);
    setZoom(false);
    setOpen(true);
  };

  /* Телефон: шаг на соседнюю страницу — по кругу, через копии по краям. */
  const stepPage = (delta: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    const pos = Math.round(strip.scrollLeft / strip.clientWidth);
    setZoom(false);
    scrollToPos(pos + delta, true);
  };

  const onStripScroll = () => {
    const strip = stripRef.current;
    if (!strip) return;
    const pos = Math.round(strip.scrollLeft / strip.clientWidth);
    const page = (pos - 1 + PAGES) % PAGES;
    if (page !== menuPage) {
      setMenuPage(page);
      setZoom(false);
    }
    /* Остановились на копии — встаём на настоящую страницу. */
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const at = Math.round(strip.scrollLeft / strip.clientWidth);
      if (at === 0) scrollToPos(PAGES, false);
      else if (at === PAGES + 1) scrollToPos(1, false);
    }, 140);
  };

  /*
    Увеличение страницы. Двойное касание увеличивает в точке касания — туда
    и прокручиваем увеличенную страницу, чтобы под пальцем осталось то, что
    хотели разглядеть. Повторное двойное касание возвращает страницу целиком.
  */
  const zoomAt = (scroller: HTMLElement | null, x?: number, y?: number) => {
    if (zoom || !scroller) {
      setZoom(false);
      return;
    }
    setZoom(true);
    const box = scroller.getBoundingClientRect();
    const px = x === undefined ? box.width / 2 : x - box.left;
    const py = y === undefined ? box.height / 4 : y - box.top;
    requestAnimationFrame(() => {
      scroller.scrollTo({
        left: px * ZOOM - box.width / 2,
        top: py * ZOOM - box.height / 2,
        behavior: "instant",
      });
    });
  };

  const onPageTap = (event: MouseEvent<HTMLDivElement>) => {
    const now = event.timeStamp;
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      zoomAt(event.currentTarget, event.clientX, event.clientY);
    } else {
      lastTap.current = now;
    }
  };

  const currentScroller = () => {
    const strip = stripRef.current;
    if (!strip) return null;
    const pos = Math.round(strip.scrollLeft / strip.clientWidth);
    return strip.querySelector<HTMLElement>(
      `[data-pos="${pos}"] .u-food-strip-scroll`,
    );
  };

  return (
    <>
      {/*
        Открывается по клику и — на касании — по отпусканию пальца. На iPhone
        кнопка стоит в горизонтальной ленте карточек, и Safari бывало не
        присылал клик после касания: окно не открывалось. Отпускание пальца
        приходит всегда; если палец сдвинулся больше чем на 10px, это была
        прокрутка ленты, а не нажатие. Клик следом ничего не меняет.
      */}
      <button
        type="button"
        className="u-food-trigger font-sans font-medium"
        onPointerDown={(event) => {
          tapStart.current =
            event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null;
        }}
        onPointerUp={(event) => {
          const start = tapStart.current;
          tapStart.current = null;
          if (!start || event.pointerType !== "touch") return;
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
          openMenu();
        }}
        onPointerCancel={() => {
          tapStart.current = null;
        }}
        onClick={openMenu}
        aria-haspopup="dialog"
      >
        <span className="u-food-trigger-label">
          {/* Маркер отдельно: на телефоне его заменяет значок (mobile.css). */}
          <span className="u-package-mark">• </span>Депозит на еду {deposit}
        </span>
        <span className="u-food-trigger-icon" aria-hidden>
          <svg viewBox="0 0 18 18" fill="none">
            <path d="M3 11.5h12M4.2 10.8a4.8 4.8 0 0 1 9.6 0M9 5.8V4.5M7.8 4.2h2.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {/*
        Окно — порталом в <body>, а не внутри карточки. На телефоне карточка
        стоит в горизонтальной ленте с прокруткой и масштабом, и iPhone окно
        оттуда не показывал. К тому же любое нажатие внутри окна всплывало до
        секции пакетов, и та выбирала пакет и уводила страницу к расчёту.
      */}
      {mounted ? createPortal(
      <dialog
        ref={dialogRef}
        className="u-food-modal"
        data-view={view}
        aria-labelledby={titleId}
        onClose={close}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          /*
            Нажатие мимо панели закрывает окно — но не клик, догнавший касание,
            которым окно только что открыли: он мог попасть на затемнение.
          */
          if (performance.now() - openedAt.current < 500) return;
          if (event.target === dialogRef.current) close();
        }}
      >
        {open ? (
          <article className="u-food-panel">
            <header className="u-food-head">
              <div>
                <p className="u-food-kicker">Пакет {packageName}</p>
                <h2 id={titleId}>Депозит на еду {deposit}</h2>
                <p>
                  Мы уже собрали удачный вариант. Его можно оставить как есть
                  или заменить и добавить любые позиции из меню.
                </p>
              </div>
              <button type="button" className="u-food-close" onClick={close} aria-label="Закрыть меню">
                <svg viewBox="0 0 16 16" aria-hidden fill="none">
                  <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <nav className="u-food-tabs" aria-label="Содержание меню">
              <button type="button" aria-pressed={view === "set"} onClick={() => { setZoom(false); setView("set"); }}>
                Наш выбор
              </button>
              <button type="button" aria-pressed={view === "menu"} onClick={() => { setMenuPage(1); setZoom(false); setView("menu"); }}>
                Меню
              </button>
            </nav>

            <div className={`u-food-body${view === "menu" ? " u-food-body-menu" : ""}`}>
              {view === "set" ? (
                <div className="u-food-set">
                  <figure className="u-food-table">
                    <Image src={tableImage} alt={`Пример сервировки для пакета ${packageName}`} fill sizes="(max-width: 700px) 94vw, 900px" />
                  </figure>

                  <div className="u-food-set-intro">
                    <h3>{items.some((item) => (item.count ?? 1) > 1) ? "Пример набора — стоимость уточнит менеджер" : "Готовый набор в рамках депозита"}</h3>
                    <strong>{deposit}</strong>
                  </div>

                  <ul className="u-food-items">
                    {items.map((item) => (
                      <li key={item.name}>
                        <span className="u-food-item-image">
                          <Image src={item.image} alt="" fill sizes="160px" />
                        </span>
                        <span className="u-food-item-copy">
                          <b>
                            {item.name}
                            <small className="food-portion">{MENU.find(([name]) => name === item.name)?.[2]}</small>
                            {item.count && item.count > 1 ? (
                              <span className="u-food-item-count">
                                ×{item.count}
                              </span>
                            ) : null}
                          </b>
                          <span>{item.price}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <aside className="u-food-note">
                    <span aria-hidden>↺</span>
                    <p>
                      <b>Набор — это рекомендация, не ограничение.</b>
                      Менеджер поможет поменять блюда, добавить позиции и
                      пересчитать разницу, если итог выйдет за депозит.
                    </p>
                  </aside>
                </div>
              ) : phone ? (
                /*
                  Телефон: окно почти во всю ширину, высота — по странице.
                  Страницы лентой по кругу, свайпом. Мелкий текст меню —
                  двойным касанием или кнопкой «Увеличить»; увеличенную
                  страницу двигают пальцем, лента на это время не листается.
                */
                <div className="u-food-strip-view" data-zoom={zoom}>
                  <div
                    ref={stripRef}
                    className="u-food-strip"
                    onScroll={onStripScroll}
                    aria-label="Полное меню"
                  >
                    {STRIP.map((page, pos) => {
                      const copy = pos === 0 || pos === PAGES + 1;
                      return (
                        <div
                          key={`${pos}-${page}`}
                          className="u-food-strip-page"
                          data-pos={pos}
                          data-current={!copy && page === menuPage}
                          aria-hidden={copy || page !== menuPage}
                        >
                          <div className="u-food-strip-scroll" onClick={onPageTap}>
                            <Image
                              src={pageSrc(page)}
                              alt={copy ? "" : pageAlt(page)}
                              width={595}
                              height={842}
                              sizes={`${Math.round(ZOOM * 100)}vw`}
                              className="u-food-strip-img"
                              draggable={false}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="u-food-strip-bar">
                    <button
                      type="button"
                      className="u-food-strip-btn"
                      onClick={() => stepPage(-1)}
                      aria-label="Предыдущая страница меню"
                    >
                      <svg viewBox="0 0 16 16" aria-hidden fill="none">
                        <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {/*
                      Номер страницы виден только читалке экрана: место в
                      панели отдано главному действию — скачать меню и
                      спокойно выбрать дома или показать подругам.
                    */}
                    <p className="u-visually-hidden" aria-live="polite">
                      {pageLabel(menuPage)}
                    </p>
                    <a
                      href={MENU_PDF}
                      download="MyWish — меню.pdf"
                      className="u-food-strip-download"
                    >
                      <svg viewBox="0 0 16 16" aria-hidden fill="none">
                        <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Скачать меню
                    </a>
                    <button
                      type="button"
                      className="u-food-strip-zoom"
                      aria-pressed={zoom}
                      aria-label={zoom ? "Уменьшить" : "Увеличить"}
                      onClick={() => zoomAt(currentScroller())}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden fill="none">
                        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
                        <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        {zoom ? null : (
                          <path d="M7 5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        )}
                        <path d="M5 7h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      <span className="u-food-strip-zoom-label" aria-hidden>
                        {zoom ? "Уменьшить" : "Увеличить"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="u-food-strip-btn"
                      onClick={() => stepPage(1)}
                      aria-label="Следующая страница меню"
                    >
                      <svg viewBox="0 0 16 16" aria-hidden fill="none">
                        <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="u-food-menu-view">
                  <div
                    className="u-food-menu-carousel"
                    tabIndex={0}
                    aria-label="Полное меню, листайте стрелками"
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") setMenuPage((page) => (page + PAGES - 1) % PAGES);
                      if (event.key === "ArrowRight") setMenuPage((page) => (page + 1) % PAGES);
                    }}
                  >
                    <div className="u-food-menu-stack">
                      {Array.from({ length: PAGES }, (_, page) => {
                        const previousPage = (menuPage + PAGES - 1) % PAGES;
                        const nextPage = (menuPage + 1) % PAGES;
                        const position =
                          page === menuPage
                            ? "active"
                            : page === previousPage
                              ? "prev"
                              : page === nextPage
                                ? "next"
                                : "hidden";
                        return (
                          <button
                            type="button"
                            key={page}
                            className="u-food-menu-page"
                            data-position={position}
                            aria-hidden={position === "hidden"}
                            tabIndex={position === "prev" || position === "next" ? 0 : -1}
                            disabled={position === "active" || position === "hidden"}
                            onClick={() => setMenuPage(page)}
                            aria-label={position === "prev" ? "Показать предыдущую страницу меню" : position === "next" ? "Показать следующую страницу меню" : undefined}
                          >
                            <Image
                              src={pageSrc(page)}
                              alt={pageAlt(page)}
                              width={595}
                              height={842}
                              sizes="(max-width: 700px) 86vw, 660px"
                            />
                          </button>
                        );
                      })}
                    </div>

                    <p className="u-food-menu-count" aria-live="polite">
                      {pageLabel(menuPage)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </article>
        ) : null}
      </dialog>,
      document.body,
      ) : null}
    </>
  );
}
