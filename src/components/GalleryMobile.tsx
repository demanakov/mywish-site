"use client";

import { useEffect, useRef, useState } from "react";
import { PHOTOS, photoSrc, type Photo } from "@/lib/gallery";

/**
 * «Как выглядит праздник» на телефоне и планшете (ниже 1024).
 *
 * Одиннадцать плиток столбцом занимали два экрана, а задача блока — не
 * показать каждый снимок, а передать атмосферу. Поэтому здесь сетка 2/1/2:
 * пять мест, и фотографии в них сами сменяют друг друга.
 *
 * Места не путают форму снимков. В подборке шесть вертикальных кадров
 * (около 5:7) и пять горизонтальных (3:2) — маленькие места сетки берут
 * только вертикальные, большое только горизонтальные. Пропорции мест
 * совпадают с пропорциями снимков, так что ничего не обрезается.
 *
 * Ритм. Первая версия меняла раз в 2.4с одно случайное место, и большое
 * попадало под смену редко: чтобы увидеть все пять горизонтальных, уходило
 * около 40 секунд. Теперь такты чередуются:
 *   такт «большое» — горизонтальные идут в большом месте по кругу, по порядку;
 *   такт «маленькие» — сразу два места: встают оба спрятанных вертикальных
 *                      снимка, второй на мгновение позже, чтобы не вспыхивало
 *                      разом.
 * За два такта (3.6с) обновляется половина сетки, все 11 снимков проходят
 * примерно за 15 секунд.
 *
 * Кадр подменяется только после того, как файл загрузился и расшифрован,
 * иначе место мигало бы пустой плашкой. Смена идёт, только пока блок на
 * экране и вкладка видна; при prefers-reduced-motion снимки стоят на месте.
 */

const TALL = PHOTOS.filter((p) => p.at[2] < p.at[3]);
const WIDE = PHOTOS.filter((p) => p.at[2] >= p.at[3]);

/** Места сетки сверху вниз: 2 маленьких, 1 большое, 2 маленьких. */
const WIDE_SLOT = 2;
const TALL_SLOTS = [0, 1, 3, 4];

/** Пауза между тактами. */
const TICK = 1800;
/** Первая смена — почти сразу, как блок вошёл в кадр. */
const FIRST_TICK = 700;
/** Второе маленькое место в такте сменяется чуть позже первого. */
const STAGGER = 260;

type Cell = { current: Photo; previous: Photo | null };

const INITIAL: Cell[] = [
  { current: TALL[0], previous: null },
  { current: TALL[1], previous: null },
  { current: WIDE[0], previous: null },
  { current: TALL[2], previous: null },
  { current: TALL[3], previous: null },
];

const shuffle = <T,>(items: T[]) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Загрузить и расшифровать файл заранее; false — если не вышло. */
const ready = async (photo: Photo) => {
  const probe = new Image();
  probe.src = photoSrc(photo);
  try {
    await probe.decode();
    return true;
  } catch {
    return false;
  }
};

export default function GalleryMobile() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [cells, setCells] = useState<Cell[]>(INITIAL);
  /* Смена выбирает снимок по тому, что сейчас на экране, — читаем из ref. */
  const cellsRef = useRef<Cell[]>(INITIAL);

  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let alive = true;
    let inView = false;
    let timer = 0;
    let wideTurn = true;
    let wideIndex = 0;
    let tallQueue: number[] = [];
    const timers: number[] = [];

    const running = () => alive && inView && !document.hidden;

    const put = (slot: number, photo: Photo) =>
      setCells((prev) =>
        prev.map((cell, i) =>
          i === slot ? { current: photo, previous: cell.current } : cell,
        ),
      );

    const schedule = (delay = TICK) => {
      window.clearTimeout(timer);
      if (running()) timer = window.setTimeout(step, delay);
    };

    const step = async () => {
      if (!running()) return;

      if (wideTurn) {
        /* Горизонтальные — по кругу, по порядку: ни один не выпадает. */
        wideIndex = (wideIndex + 1) % WIDE.length;
        const photo = WIDE[wideIndex];
        if ((await ready(photo)) && alive) put(WIDE_SLOT, photo);
      } else {
        /* Два маленьких места; очередь мест перемешивается, когда кончается. */
        if (tallQueue.length < 2) tallQueue = shuffle(TALL_SLOTS);
        const slots = tallQueue.splice(0, 2);
        const onScreen = new Set(cellsRef.current.map((c) => c.current.node));
        const hidden = shuffle(TALL.filter((p) => !onScreen.has(p.node)));
        const pairs = slots
          .map((slot, i) => [slot, hidden[i]] as const)
          .filter(([, photo]) => photo !== undefined);
        const loaded = await Promise.all(pairs.map(([, photo]) => ready(photo)));
        if (!alive) return;
        pairs.forEach(([slot, photo], i) => {
          if (!loaded[i]) return;
          if (i === 0) put(slot, photo);
          else timers.push(window.setTimeout(() => alive && put(slot, photo), STAGGER));
        });
      }

      wideTurn = !wideTurn;
      schedule();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const was = inView;
        inView = entry.isIntersecting;
        if (inView && !was) schedule(FIRST_TICK);
        if (!inView) window.clearTimeout(timer);
      },
      { threshold: 0.3 },
    );
    observer.observe(root);
    const onVisibility = () => (document.hidden ? window.clearTimeout(timer) : schedule(FIRST_TICK));
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      timers.forEach((t) => window.clearTimeout(t));
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /* Кнопок паузы и «Следующие фото» нет по просьбе заказчика: снимки меняются сами. */
  return (
    <div ref={rootRef} className="gallery-mix">
      {cells.map((cell, i) => (
        <div key={i} className="gallery-mix-cell" data-wide={i === WIDE_SLOT}>
          {/*
            Прежний снимок лежит под новым, пока тот проявляется: смена —
            это перетекание одного кадра в другой, а не вспышка фона.
          */}
          {cell.previous ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`was-${cell.previous.node}`}
              src={photoSrc(cell.previous)}
              alt=""
              aria-hidden
              className="gallery-mix-img"
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={cell.current.node}
            src={photoSrc(cell.current)}
            alt={cell.current.alt}
            loading="lazy"
            decoding="async"
            className="gallery-mix-img"
            data-fresh={cell.previous !== null}
          />
        </div>
      ))}
    </div>
  );
}
