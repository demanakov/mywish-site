"use client";

import { useEffect, useState } from "react";
import MobileHeader from "./MobileHeader";

/**
 * Плавающая шапка на телефоне и планшете (ниже 1024).
 *
 * Шапка первого экрана уезжает вместе с ним, а позвонить или открыть меню
 * хочется и из середины страницы. Постоянно висящая сверху полоса отнимала
 * бы и без того небольшой экран, поэтому шапка ведёт себя, как в браузерах и
 * приложениях: листаешь вниз — прячется, потянул вверх — выезжает. На первом
 * экране её нет: там своя шапка.
 *
 * Мелкое дрожание пальца (меньше 8px) направление не меняет.
 *
 * Зона часов на iPhone. Safari 26 заливает её сплошным цветом, если у
 * верхнего края экрана, в его середине, стоит fixed-элемент шириной почти во
 * весь экран (WebKit, LocalFrameView::fixedContainerEdges: 90…105% ширины).
 * Шапка во всю ширину была ровно таким элементом: при прокрутке вверх она
 * выезжала — и над страницей появлялась полоса. Поэтому шапка — не полоса, а
 * три отдельные капсулы (звонок, логотип, меню), каждая сама по себе fixed и
 * узкая: Safari их не учитывает, и страница видна под часами всегда.
 *
 * Спрятанная шапка к тому же убирается из отрисовки целиком (hidden).
 * Порядок: показать — снять hidden, через два кадра выехать; спрятать —
 * уехать и после перехода (240мс) снова hidden.
 */

const NARROW = "(max-width: 1023.98px)";
const JITTER = 8;
/** Переход ухода в mobile.css — 240мс; hidden ставим чуть позже. */
const HIDE_AFTER = 280;

export default function MobileFloatingHeader() {
  const [shown, setShown] = useState(false);
  /** Шапка в дереве отрисовки: false — спрятана целиком, fixed-элемента нет. */
  const [present, setPresent] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(NARROW);
    let last = window.scrollY;
    let frame = 0;
    let wanted = false;
    let reveal = 0;
    let removal = 0;

    const setWanted = (next: boolean) => {
      if (next === wanted) return;
      wanted = next;
      cancelAnimationFrame(reveal);
      window.clearTimeout(removal);
      if (next) {
        setPresent(true);
        /* Два кадра: браузер успевает нарисовать шапку за краем, и она выезжает. */
        reveal = requestAnimationFrame(() => {
          reveal = requestAnimationFrame(() => setShown(true));
        });
      } else {
        setShown(false);
        removal = window.setTimeout(() => setPresent(false), HIDE_AFTER);
      }
    };

    /* Первый экран ещё почти весь виден — там своя шапка. */
    const onHero = () => {
      const hero = document.querySelector<HTMLElement>("#hero, .halls-hero");
      const bottom = hero ? hero.getBoundingClientRect().bottom : window.innerHeight;
      return bottom > window.innerHeight * 0.35;
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (!media.matches || onHero()) {
        last = y;
        setWanted(false);
        return;
      }
      const delta = y - last;
      if (Math.abs(delta) < JITTER) return;
      last = y;
      setWanted(delta < 0);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(reveal);
      window.clearTimeout(removal);
      window.removeEventListener("scroll", onScroll);
      media.removeEventListener("change", update);
    };
  }, []);

  return (
    <div
      className="m-floating"
      data-shown={shown}
      hidden={!present}
      inert={!shown}
      aria-hidden={!shown}
    >
      <MobileHeader floating />
    </div>
  );
}
