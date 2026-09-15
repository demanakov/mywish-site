"use client";

import { useEffect, useRef, useState } from "react";
import SectionHeading from "./SectionHeading";
import { box } from "@/lib/px";

/**
 * Секция 4 «REELS после праздника» — Figma 914:1183 … 914:1166.
 * Сцена: макет 3197…4064 → 2241 на странице.
 * Три вертикальных ролика 380×676, зазор 20, кнопка play по центру кадра.
 *
 * Заставка карточки — кадр из макета, тот же, что стоял здесь раньше. Поверх
 * него проигрывается настоящий ролик.
 *
 * Ролик лежит отдельным слоем над картинкой и проявляется, а не подменяет её
 * через атрибут poster. Poster показывается только до первого запуска: стоит
 * ролику отыграть и встать на паузу, браузер оставит на экране его собственный
 * первый кадр — и заставка молча сменилась бы на кадр из видео. Слой поверх
 * этого не допускает: в покое всегда виден ровно макетный кадр.
 *
 * Проявление ждёт события playing, а не самого вызова play(): ролик грузится
 * по требованию, и слой, показанный раньше времени, дал бы чёрный кадр.
 *
 * Звук. Ролики со звуком, но по умолчанию он выключен: без звука браузер
 * разрешает запуск без нажатия, и страница не заговорит сама. В правом
 * верхнем углу каждой карточки — кнопка звука, видна всегда. Звук общий на
 * всю секцию: включили на одном ролике — со звуком играют все, выключили —
 * все без звука. Если браузер всё же не пустил ролик со звуком (iPhone при
 * переходе к следующему без нового нажатия), ролик играет без звука, а кнопка
 * возвращается в «выключено» — показывает честное состояние.
 *
 * Карточка — не кнопка, а обёртка: внутри кнопка во весь кадр (смотреть,
 * пауза) и отдельная кнопка звука. Кнопка внутри кнопки в разметке
 * недопустима, и нажатие по звуку засчитывалось бы как пауза.
 *
 * Два режима — по устройству ввода, а не по ширине:
 *
 *   курсор (hover: hover) — как было: ролик играет целиком, пока курсор на
 *     карточке, и заходит на второй круг; ушёл курсор — встал и отмотан;
 *
 *   касание (hover: none) — наведения нет, и прежняя схема ломалась: касание
 *     браузер присылает как «наведение», а следом клик — первое запускало
 *     ролик, второй тут же его останавливал. Поэтому здесь как в сторис:
 *       • текущая карточка — почти во весь экран, у левого поля; следующая
 *         выглядывает справа, меньше и тише;
 *       • сам играет текущий ролик, пока блок на экране; остальные стоят;
 *       • касание текущего — пауза и продолжение, касание соседнего — лента
 *         доезжает до него;
 *       • доиграл — лента переходит к следующему;
 *       • лента круговая: за последним снова первый, и назад так же;
 *       • полоска внизу карточки показывает, сколько осталось;
 *       • ушли с блока или свернули вкладку — пауза;
 *       • при экономии трафика и prefers-reduced-motion сам ролик не стартует,
 *         только по касанию.
 *     Грузится только ролик, который играет: у остальных preload="none".
 *     Облегчённые версии для телефона (540px) пробовали и отказались: ролики
 *     и так сжаты экономно (~1.1 Мбит/с), уменьшение давало лишь −35% веса,
 *     а на тёмных кадрах с движением картинка рассыпалась на квадраты.
 *
 * Круг. В режиме касания лента — это карточки с копиями по краям:
 *   [копия последней, 1, 2, 3, копия первой, копия второй].
 * Копия последней — цель свайпа назад с первой карточки; копии первой и второй
 * стоят справа от последней — одна для перехода, вторая, чтобы в момент
 * перехода справа выглядывало то же, что будет после перестановки. Лента
 * остановилась на копии — без анимации переставляется на настоящую карточку:
 * кадр тот же, перескока не видно. Копии — только заставка, без видео.
 */

type Card = {
  /** Нода карточки в макете. */
  node: string;
  /** Имя ролика в public/video/reels — заставка при этом своя, из макета. */
  file: string;
  x: number;
  /** Описание заставки: alt относится к кадру из макета, а не к ролику. */
  alt: string;
};

const CARDS: Card[] = [
  {
    node: "1159",
    file: "black",
    x: 130,
    alt: "Reels с праздника — конфетти и танцы",
  },
  {
    node: "1163",
    file: "flamingo",
    x: 530,
    alt: "Reels с праздника — неоновая надпись",
  },
  {
    node: "1167",
    file: "white",
    x: 930,
    alt: "Reels с праздника — гостья с шарами",
  },
];

const N = CARDS.length;

/** На iPhone во весь экран открывается только сам ролик — своим методом WebKit. */
type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/** Четыре уголка — «развернуть во весь экран». */
function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const TOUCH_QUERY = "(hover: none)";

/** Касание: номер карточки в каждой позиции ленты, с копиями по краям. */
const LOOP = [N - 1, ...CARDS.map((_, i) => i), 0, 1];
/** Касание: позиция настоящей первой карточки. */
const FIRST = 1;

/** Динамик: перечёркнутый — звук выключен, с волнами — включён. */
function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {on ? (
        <path
          d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="m15.5 9.5 5 5m0-5-5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function ReelCard({
  card: { node, file, x, alt },
  clone,
  touch,
  current,
  active,
  wanted,
  sound,
  onTap,
  onEnded,
  onSound,
  onSoundBlocked,
  onFullscreenExit,
}: {
  card: Card;
  /** Копия для круга: заставка без ролика, не для чтения и не для табуляции. */
  clone: boolean;
  /** Режим касания (см. шапку файла). */
  touch: boolean;
  /** Касание: карточка стоит на месте текущей — крупная. */
  current: boolean;
  /** Касание: это настоящая карточка текущего ролика. */
  active: boolean;
  /** Касание: ролик сейчас должен играть. */
  wanted: boolean;
  /** Звук включён — общий для всех роликов. */
  sound: boolean;
  onTap: () => void;
  onEnded: () => void;
  onSound: () => void;
  /** Браузер не пустил ролик со звуком — звук выключается у всех. */
  onSoundBlocked: () => void;
  /** Закрыли просмотр во весь экран: ролик остался играть или встал. */
  onFullscreenExit: (playing: boolean) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLElement>(null);
  /** Слой ролика виден: ролик хоть раз пошёл с последнего запуска. */
  const [playing, setPlaying] = useState(false);
  /** Ролик идёт прямо сейчас — не на паузе. */
  const [running, setRunning] = useState(false);
  /** Касание: ролик должен играть — для обработчиков, срабатывающих позже. */
  const wantedRef = useRef(false);
  /** Ролик открыт во весь экран: лента и курсор его не трогают. */
  const fullRef = useRef(false);
  /** Свежие значения для подписок, которые ставятся один раз. */
  const latest = useRef({ sound, touch, onFullscreenExit });
  useEffect(() => {
    latest.current = { sound, touch, onFullscreenExit };
  });

  /*
    Звук переключают на ходу: свойство muted, атрибут React задаёт только раз.

    В режиме касания звук бывает только у ролика, который должен играть.
    Остальные немые всегда: если какой-то всё же запустится (запуск опоздал,
    а ленту уже перелистнули), он хотя бы не заговорит из-за кадра.
  */
  useEffect(() => {
    const video = ref.current;
    if (!video || fullRef.current) return;
    video.muted = !sound || (touch && !wantedRef.current);
  }, [sound, touch]);

  /*
    Запуск с учётом звука. Браузер может отказать ролику со звуком без
    свежего нажатия — тогда запускаем без звука и выключаем звук у всех.
    Прочие отказы (ролик ещё грузится, пауза раньше запуска) — норма.
  */
  const start = () => {
    const video = ref.current;
    if (!video) return;
    video.play().catch((error: DOMException) => {
      if (error.name !== "NotAllowedError" || video.muted) return;
      video.muted = true;
      /* Пока браузер отказывал, ленту могли перелистнуть — тогда не запускаем. */
      if (latest.current.touch && !wantedRef.current) return;
      onSoundBlocked();
      video.play().catch(() => {});
    });
  };

  /*
    preload="none": ролики не должны грузиться, пока их никто не смотрит.
  */
  const play = () => {
    const video = ref.current;
    if (!video) return;
    /* Всегда с первого кадра: вернулись к карточке — смотрим сначала. */
    video.currentTime = 0;
    start();
  };

  /** На уходе курсора отматываем в начало: следующее наведение начнёт заново. */
  const stop = () => {
    const video = ref.current;
    /* Во весь экран курсор «уходит» с карточки — это не повод останавливать. */
    if (!video || fullRef.current) return;
    setPlaying(false);
    video.pause();
    video.currentTime = 0;
  };

  /*
    Во весь экран. На iPhone полноэкранным бывает только сам <video> — через
    webkitEnterFullscreen, со встроенным плеером Apple; на остальных —
    стандартный requestFullscreen с элементами управления. Нажатие — жест
    пользователя, поэтому звук включаем сразу: во весь экран смотрят со звуком.
  */
  const openFullscreen = () => {
    const video = ref.current as FullscreenVideo | null;
    if (!video) return;
    fullRef.current = true;
    video.preload = "auto";
    video.muted = false;
    video.controls = true;
    video.play().catch(() => {});
    const iphone =
      !document.fullscreenEnabled && typeof video.webkitEnterFullscreen === "function";
    if (!iphone && video.requestFullscreen) {
      video.requestFullscreen().catch(closeFullscreen);
      return;
    }
    try {
      video.webkitEnterFullscreen?.();
    } catch {
      /* Метаданные ещё не пришли — iPhone откажет; входим, как только придут. */
      video.addEventListener(
        "loadedmetadata",
        () => {
          try {
            video.webkitEnterFullscreen?.();
          } catch {
            closeFullscreen();
          }
        },
        { once: true },
      );
    }
  };

  /** Вышли из полного экрана: звук и игра — снова по правилам ленты. */
  function closeFullscreen() {
    const video = ref.current;
    if (!video || !fullRef.current) return;
    fullRef.current = false;
    video.controls = false;
    const { sound, touch, onFullscreenExit } = latest.current;
    if (touch && !wantedRef.current) {
      video.pause();
      video.muted = true;
    } else {
      video.muted = !sound;
    }
    onFullscreenExit(!video.paused);
  }

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onChange = () => {
      if (document.fullscreenElement !== video) closeFullscreen();
    };
    video.addEventListener("webkitendfullscreen", closeFullscreen);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      video.removeEventListener("webkitendfullscreen", closeFullscreen);
      document.removeEventListener("fullscreenchange", onChange);
    };
    // closeFullscreen читает только ref-ы — подписка ставится один раз.
  }, []);

  /* Касание: карточка перестала быть текущей — ролик встаёт и отматывается. */
  useEffect(() => {
    if (!touch || active) return;
    stop();
    if (barRef.current) barRef.current.style.transform = "scaleX(0)";
    // stop читает только ref — пересоздавать эффект незачем.
     
  }, [touch, active]);

  /* Касание: играть или стоять решает лента, карточка только исполняет. */
  useEffect(() => {
    const video = ref.current;
    if (!touch || !video) return;
    wantedRef.current = wanted;
    if (fullRef.current) return;
    if (wanted) {
      video.muted = !sound;
      video.preload = "auto";
      start();
    } else {
      video.pause();
      video.muted = true;
    }
    // start читает только ref и колбэк — пересоздавать эффект незачем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touch, wanted]);

  /* Полоска прогресса — каждый кадр, пока ролик идёт; без перерисовки React. */
  useEffect(() => {
    if (!touch || !running) return;
    let frame = 0;
    const tick = () => {
      const video = ref.current;
      const bar = barRef.current;
      if (video && bar && video.duration) {
        bar.style.transform = `scaleX(${video.currentTime / video.duration})`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [touch, running]);

  const soundLabel = sound ? "Выключить звук" : "Включить звук";

  return (
    <div
      data-node-id={clone ? undefined : `914:${node}`}
      className="u-reel group block overflow-hidden rounded-card"
      style={box(x, 191, 380, 676)}
      data-current={touch ? current : undefined}
      data-clone={clone || undefined}
      data-running={running}
      aria-hidden={clone || undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") play();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") stop();
      }}
    >
      {/* Заставка — кадр из макета 914:{node}. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/figma/reels/n${node}.webp`}
        alt={clone ? "" : alt}
        loading="lazy"
        decoding="async"
        className="u-reel-media size-full max-w-none object-cover"
      />

      {clone ? null : (
        <video
          ref={ref}
          className="u-reel-video absolute inset-0 size-full max-w-none object-cover"
          data-playing={playing}
          preload="none"
          muted={!sound}
          /* Касание: по окончании лента переходит к следующему — круг не нужен. */
          loop={!touch}
          playsInline
          aria-hidden
          onPlaying={() => {
            setPlaying(true);
            setRunning(true);
          }}
          onPause={() => setRunning(false)}
          onEnded={() => {
            setRunning(false);
            /* Досмотрели во весь экран — ленту под плеером не листаем. */
            if (touch && !fullRef.current) onEnded();
          }}
        >
          <source src={`/video/reels/${file}-full.mp4`} type="video/mp4" />
        </video>
      )}

      {/* Кнопка во весь кадр: смотреть, пауза, перейти к карточке. */}
      <button
        type="button"
        className="u-reel-hit absolute inset-0 cursor-pointer"
        tabIndex={clone ? -1 : undefined}
        aria-label={
          touch && active
            ? `${running ? "Пауза" : "Смотреть"}: ${alt}`
            : `Смотреть ${alt}`
        }
        /* Клавиатура доходит до карточки табом — ролик должен играть и там. */
        onFocus={() => {
          if (!touch) play();
        }}
        onBlur={() => {
          if (!touch) stop();
        }}
        onClick={() => {
          if (touch) return onTap();
          /* Клавиатура: Enter/пробел — запустить или остановить. */
          if (ref.current?.paused) play();
          else stop();
        }}
      />

      {/* Кнопка play: 914:1160 (круг) + 914:1161 (треугольник) */}
      <span
        aria-hidden
        className="u-reel-play absolute flex items-center justify-center rounded-pill"
        style={box(153, 300, 75, 75)}
      >
        <svg viewBox="0 0 35 35" className="size-35" fill="none" aria-hidden>
          <path
            d="M12 8.5 L27 17.5 L12 26.5 Z"
            fill="currentColor"
            strokeWidth="4"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Во весь экран — правый верхний угол; у копий только вид, как у звука. */}
      {clone ? (
        <span aria-hidden className="u-reel-full">
          <FullscreenIcon />
        </span>
      ) : (
        <button
          type="button"
          className="u-reel-full"
          aria-label={`Смотреть во весь экран: ${alt}`}
          title="Во весь экран"
          onClick={openFullscreen}
        >
          <FullscreenIcon />
        </button>
      )}

      {/*
        Звук — общий на всю секцию. У копий для круга — тот же вид, но не
        кнопка: копия видна мгновение и нажимать там нечего.
      */}
      {clone ? (
        <span aria-hidden className="u-reel-sound" data-on={sound}>
          <SoundIcon on={sound} />
        </span>
      ) : (
        <button
          type="button"
          className="u-reel-sound"
          data-on={sound}
          aria-pressed={sound}
          aria-label={soundLabel}
          title={soundLabel}
          onClick={() => {
            /* Нажатие — жест пользователя: звук включаем прямо в нём. */
            if (ref.current) ref.current.muted = sound;
            onSound();
          }}
        >
          <SoundIcon on={sound} />
        </button>
      )}

      {/* Касание: сколько осталось. На курсоре скрыта (mobile.css). */}
      {clone ? null : (
        <span aria-hidden className="u-reel-progress">
          <i ref={barRef} />
        </span>
      )}
    </div>
  );
}

export default function Reels() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [touch, setTouch] = useState(false);
  const autoplayRef = useRef(true);
  /** Позиция текущей карточки в ленте (в режиме касания — с учётом копий). */
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  /** Касание: человек поставил текущий ролик на паузу (или ещё не запускал). */
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  /** Звук у всех роликов секции. По умолчанию выключен. */
  const [sound, setSound] = useState(false);
  /**
   * Касание: лента в движении — ролики ждут. Раньше текущую карточку
   * переключали прямо на прокрутке, и ролик запускался у любой, мимо которой
   * лента проезжала, — в том числе у той, что уже за кадром. Теперь играть
   * начинает только карточка, на которой лента остановилась.
   */
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);

  const slides = touch ? LOOP : CARDS.map((_, i) => i);
  const active = slides[pos] ?? 0;

  /* Режим ввода и разрешение на автозапуск — только в браузере. */
  useEffect(() => {
    const media = window.matchMedia(TOUCH_QUERY);
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    const quiet =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      Boolean(connection?.saveData);
    autoplayRef.current = !quiet;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize external selection/media with the imperative carousel.
    setPaused(quiet);
    const update = () => setTouch(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const slidesOf = (track: HTMLElement) =>
    Array.from(track.querySelectorAll<HTMLElement>(":scope > .u-reel"));

  /** Левый край ленты, к которому прижимается текущая карточка. */
  const baseOf = (track: HTMLElement) =>
    track.getBoundingClientRect().left +
    (parseFloat(getComputedStyle(track).paddingLeft) || 0);

  /* Прокрутить ленту так, чтобы карточка в позиции p встала у левого поля. */
  const scrollToPos = (p: number, smooth: boolean) => {
    const track = trackRef.current;
    const slide = track ? slidesOf(track)[p] : null;
    if (!track || !slide) return;
    track.scrollTo({
      left: track.scrollLeft + slide.getBoundingClientRect().left - baseOf(track),
      behavior: smooth ? "smooth" : "instant",
    });
  };

  const select = (p: number, list: number[]) => {
    if (p === posRef.current) return;
    const was = list[posRef.current];
    posRef.current = p;
    setPos(p);
    /* Сменился ролик (а не копия на оригинал) — новый стартует сам, если можно. */
    if (list[p] !== was) setPaused(!autoplayRef.current);
  };

  /* Режим касания включился — копии дорисованы, встаём на настоящую первую. */
  useEffect(() => {
    const start = touch ? FIRST : 0;
    posRef.current = start;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize external selection/media with the imperative carousel.
    setPos(start);
    if (touch) scrollToPos(start, false);
    // scrollToPos читает только ref — пересоздавать эффект незачем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touch]);

  /* Касание: блок на экране и вкладка видна — иначе ролик стоит. */
  useEffect(() => {
    const track = trackRef.current;
    if (!touch || !track) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.5 },
    );
    observer.observe(track);
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [touch]);

  /** Позиция карточки, ближайшей к левому полю ленты. */
  const nearest = (track: HTMLElement) => {
    const base = baseOf(track);
    let best = Infinity;
    let found = 0;
    slidesOf(track).forEach((slide, p) => {
      const distance = Math.abs(slide.getBoundingClientRect().left - base);
      if (distance < best) {
        best = distance;
        found = p;
      }
    });
    return found;
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!touch || !track || "jumping" in track.dataset) return;
    /* Рамка текущей карточки едет за пальцем; ролики — только после остановки. */
    select(nearest(track), LOOP);
    if (!movingRef.current) {
      movingRef.current = true;
      setMoving(true);
    }
  };

  /*
    Круг. Лента остановилась на копии — без анимации переставляем её на
    настоящую карточку. На время перестановки анимации размера выключены
    (data-jumping), иначе карточка «дышала» бы на месте.
    Остановку ловим двумя способами сразу: scrollend есть не везде (Safari до
    26), а на мгновенную прокрутку он приходит не всегда — поэтому ещё и
    160мс тишины после последнего события прокрутки. Остановка идемпотентна.
  */
  useEffect(() => {
    const track = trackRef.current;
    if (!touch || !track) return;
    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      const p = nearest(track);
      const target = p === 0 ? N : p > N ? p - N : p;
      if (target !== p) {
        track.dataset.jumping = "";
        scrollToPos(target, false);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => delete track.dataset.jumping),
        );
      }
      select(target, LOOP);

      /*
        Страховка: играть может только ролик на месте текущего. Всё остальное —
        на паузу и без звука, даже если чей-то запуск опоздал.
      */
      const current = slidesOf(track)[target]?.querySelector("video");
      track.querySelectorAll("video").forEach((video) => {
        if (video === current || document.fullscreenElement === video) return;
        video.pause();
        video.muted = true;
      });

      movingRef.current = false;
      setMoving(false);
    };
    const onIdle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 160);
    };
    track.addEventListener("scroll", onIdle, { passive: true });
    if ("onscrollend" in window) track.addEventListener("scrollend", settle);

    /* Повернули телефон — ширина карточки другая: выравниваем по текущей. */
    const onResize = () => scrollToPos(posRef.current, false);
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(timer);
      track.removeEventListener("scrollend", settle);
      track.removeEventListener("scroll", onIdle);
      window.removeEventListener("resize", onResize);
    };
    // Функции выше читают только ref-ы — пересоздавать подписки незачем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touch]);

  const onTap = (p: number) => {
    if (p !== posRef.current) {
      scrollToPos(p, true);
      select(p, LOOP);
      /* Касание соседнего — явное желание смотреть, даже без автозапуска. */
      setPaused(false);
      return;
    }
    setPaused((was) => !was);
  };

  /* Доиграл — к следующей позиции; за последним стоит копия первого. */
  const onEnded = (i: number) => {
    if (LOOP[posRef.current] !== i) return;
    const next = posRef.current + 1;
    scrollToPos(next, true);
    select(next, LOOP);
    setPaused(false);
  };

  return (
    <section id="reels" data-section="reels" style={box(0, 2241, 1440, 867)}>
      <SectionHeading size="l" node="914:1183" at={[563, 0, 314, 100]} accent=" праздника">
        REELS после
      </SectionHeading>

      <p className="u-lede" data-node-id="914:1182" style={box(367, 114, 704, 28)}>
        Reels входит в каждый пакет — ты получишь его уже смонтированным.
      </p>

      {/*
        Дорожка карточек. На десктопе display: contents — карточки стоят на
        координатах секции, как раньше; на телефоне это лента со свайпом
        (см. mobile.css). Копии для круга дорисовываются только в режиме
        касания, поэтому десктопной раскладки они не касаются.
      */}
      <div ref={trackRef} className="reels-track contents" onScroll={onScroll}>
        {slides.map((i, p) => {
          const clone = touch && (p < FIRST || p >= FIRST + N);
          return (
            <ReelCard
              key={clone ? `clone-${p}` : CARDS[i].node}
              card={CARDS[i]}
              clone={clone}
              touch={touch}
              current={p === pos}
              active={!clone && i === active}
              wanted={
                touch &&
                !clone &&
                i === active &&
                inView &&
                visible &&
                !paused &&
                !moving
              }
              sound={sound}
              onTap={() => onTap(p)}
              onEnded={() => onEnded(i)}
              onSound={() => setSound((was) => !was)}
              onSoundBlocked={() => setSound(false)}
              onFullscreenExit={(stillPlaying) => {
                /* Досмотрели или поставили на паузу в плеере — лента это помнит. */
                if (touch && !clone && i === active) setPaused(!stillPlaying);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
