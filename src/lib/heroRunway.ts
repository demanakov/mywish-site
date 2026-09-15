"use client";

/**
 * Запас первого экрана под строкой состояния iPhone.
 *
 * Safari 26 на iPhone, пока страница не прокручена, ставит её начало ниже
 * часов, а зону над ним заливает фоном: страница заходит под часы только при
 * прокрутке. Поэтому на iPhone первый экран выше на --hero-runway (mobile.css,
 * чуть больше строки состояния), а страница открывается прокрученной ровно на
 * эту величину: верх кадра уже под часами, заголовок и кнопки — на прежнем
 * месте над панелью браузера.
 *
 * Верхняя точка страницы — запас, а не ноль. Совсем запретить Safari
 * долистывать до края нельзя (и оттягивание за край — системный жест), поэтому
 * страницу, оставшуюся выше запаса, мягко возвращаем к нему — когда палец
 * отпущен и прокрутка остановилась. Так же, как при открытии: наверху нет
 * полосы и пустого зазора над шапкой.
 *
 * Признак data-runway на <html> включает запас в CSS. Только iPhone и только
 * ширина телефона: у остальных браузеров зона часов не прозрачная, и сдвиг
 * просто спрятал бы верх кадра. Используют первые экраны главной и залов.
 */

const PHONE = "(max-width: 767.98px)";
/** Тишина после последнего события прокрутки, если scrollend не приходит. */
const SETTLE = 140;

/** Высота запаса в пикселях; 0 — запаса нет (не iPhone, не телефон, нет первого экрана). */
export function heroRunway() {
  const root = document.documentElement;
  if (!("runway" in root.dataset)) return 0;
  const styles = getComputedStyle(root);
  const rem = parseFloat(styles.fontSize) || 16;
  return parseFloat(styles.getPropertyValue("--hero-runway")) * rem || 0;
}

/**
 * Включает запас: страница открывается прокрученной на него (если не пришли
 * по якорю и браузер не вернул позицию ниже), а выше него не задерживается.
 * Возвращает отмену — для ухода со страницы.
 */
export function enableHeroRunway() {
  const root = document.documentElement;
  if (!window.matchMedia(PHONE).matches || !/iPhone|iPod/.test(navigator.userAgent)) {
    return () => {};
  }
  root.dataset.runway = "";
  const start = heroRunway();
  if (!window.location.hash && window.scrollY < start) {
    window.scrollTo({ top: start, behavior: "instant" });
  }

  let touching = false;
  let timer = 0;

  const settle = () => {
    window.clearTimeout(timer);
    /* Палец ещё на экране или открыто окно поверх страницы — не вмешиваемся. */
    if (touching || "menuOpen" in root.dataset || root.classList.contains("food-modal-open")) {
      return;
    }
    const top = heroRunway();
    if (top && window.scrollY < top - 1) {
      window.scrollTo({ top, behavior: "smooth" });
    }
  };
  const onScroll = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(settle, SETTLE);
  };
  const onTouchStart = () => {
    touching = true;
    window.clearTimeout(timer);
  };
  const onTouchEnd = () => {
    touching = false;
    onScroll();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", settle);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", settle);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
    delete root.dataset.runway;
  };
}
