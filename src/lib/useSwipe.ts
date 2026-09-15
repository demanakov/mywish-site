"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

/**
 * Листание кадров пальцем: горизонтальный свайп — шаг вперёд или назад.
 *
 * Нужен там, где кадр листается стрелками, а на телефоне стрелка — мелкая
 * цель, и рука и так уже на фотографии: в карточке зала и в полноэкранном
 * просмотре на странице залов.
 *
 * Вертикальную прокрутку страницы не отнимаем: у элемента должно стоять
 * touch-action: pan-y — тогда браузер сам прокручивает страницу по вертикали
 * (и присылает pointercancel), а горизонтальный жест отдаёт сюда. Мышь не
 * слушаем: на десктопе перетаскивание кадра никто не ждёт.
 *
 * Свайп по кнопке «открыть во весь экран» не должен её нажимать: клик,
 * пришедший следом за свайпом, гасим на всплытии вверх (onClickCapture).
 * Признак сбрасывается на следующем касании — если браузер клика не прислал,
 * следующее обычное нажатие не пропадёт.
 */
const THRESHOLD = 36;

export function useSwipe(onStep: (delta: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      start.current = { x: event.clientX, y: event.clientY };
      swiped.current = false;
    },
    onPointerUp: (event: PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      /* Жест скорее горизонтальный, чем вертикальный, и не случайное дрожание. */
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      swiped.current = true;
      onStep(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = null;
    },
    onClickCapture: (event: MouseEvent) => {
      if (!swiped.current) return;
      swiped.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
