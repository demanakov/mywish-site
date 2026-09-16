"use client";

import { useEffect } from "react";

/**
 * Рост Руби в карточках пакетов на десктопе — одна величина на все три.
 *
 * Руби стоит за кнопкой «Выбрать» ногами на нижней кромке окна
 * (.u-package-mascot-stage), а сверху не должен заходить на текст. Самой
 * длинной получается карточка «Вау», и предельный рост задаёт она: свободное
 * место от последней строки текста до кромки окна минус зазор. Этот рост
 * ставится всем трём — Руби одинаковые.
 *
 * Постоянной в CSS не обойтись: кегль текста в карточках ограничен снизу в
 * пикселях, и на узком десктопе текст относительно крупнее и опускается
 * ниже — Руби фиксированного роста там заезжал на добавки «Вау».
 *
 * Меряем по offsetTop/offsetHeight, а не по getBoundingClientRect: карточки
 * приподнимаются при наведении и сжимаются при приглушении, а на расчёт это
 * влиять не должно. Пересчёт — при изменении размеров карточек, окна и после
 * загрузки шрифтов. Результат — переменная --ruby-figure на секции.
 */

const DESKTOP = "(min-width: 1024px)";
/** Зазор между текстом и макушкой Руби, в rem. */
const GAP = 0.75;

/** Отступ элемента от верха карточки через цепочку offsetParent. */
const topWithin = (el: HTMLElement, card: HTMLElement) => {
  let top = 0;
  for (let node: HTMLElement | null = el; node && node !== card; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
  }
  return top;
};

export default function PackagesRuby() {
  useEffect(() => {
    const section = document.getElementById("packages");
    if (!section) return;
    const media = window.matchMedia(DESKTOP);
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (!media.matches) {
        section.style.removeProperty("--ruby-figure");
        return;
      }
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      let size = Infinity;
      section.querySelectorAll<HTMLElement>(".u-package-card").forEach((card) => {
        const stage = card.querySelector<HTMLElement>(".u-package-mascot-stage");
        if (!stage) return;
        let textBottom = 0;
        card
          .querySelectorAll<HTMLElement>(".u-package-lede, .u-package-group > *")
          .forEach((line) => {
            textBottom = Math.max(textBottom, topWithin(line, card) + line.offsetHeight);
          });
        const floor = card.offsetHeight - (parseFloat(getComputedStyle(stage).bottom) || 0);
        size = Math.min(size, floor - textBottom - GAP * rem);
      });
      if (Number.isFinite(size) && size > 0) {
        section.style.setProperty("--ruby-figure", `${Math.floor(size)}px`);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(schedule);
    section.querySelectorAll(".u-package-card").forEach((card) => observer.observe(card));
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    document.fonts?.ready.then(schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
    };
  }, []);

  return null;
}
