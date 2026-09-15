"use client";
import Link from "next/link";

import { useState, type CSSProperties } from "react";
import SectionHeading from "./SectionHeading";
import { box } from "@/lib/px";
import { HALLS } from "@/lib/halls.mjs";
import { pickHall, useOrder } from "@/lib/order";
import StepDone from "./StepDone";
import HallsMobile from "./HallsMobile";

type FloorPlacement = {
  slug: string;
  shape: [number, number][];
};

type HousePlacement = {
  src: string;
  /** Папка нарисованных состояний в public/halls/states. */
  states: string;
  address: string;
  alt: string;
  at: [number, number, number, number];
  floors: FloorPlacement[];
};

/*
  Девять отдельных контуров проходят по реальным проёмам залов. В маски не
  входят крыши, наружные стены и боковые таблички — только сам видимый этаж.
  Координаты заданы в процентах исходного изображения дома и одновременно
  используются для зоны клика, подсветки и выбранной обводки.
*/
const HOUSES: HousePlacement[] = [
  {
    src: "/figma/2-halls/hall-photo-a.webp",
    states: "kachalova_8i",
    address: "Качалова, 8И",
    alt: "Площадка MyWish на Профессора Качалова, 8И",
    at: [41, 189, 551, 646],
    floors: [
      {
        slug: "barbie",
        shape: [
          [37.1, 23.1],
          [83.2, 22.8],
          [83.2, 43.5],
          [81.7, 44.4],
          [53.2, 46.5],
          [37.1, 43.9],
        ],
      },
      {
        slug: "sicily",
        shape: [
          [37.1, 44.1],
          [53.2, 46.5],
          [81.7, 44.5],
          [83.2, 44.6],
          [83.2, 66.9],
          [81.7, 67.8],
          [52.8, 70.3],
          [37.1, 67.1],
        ],
      },
      {
        slug: "ocean-drive",
        shape: [
          [37.1, 67.3],
          [52.8, 70.3],
          [81.7, 67.9],
          [83.2, 68],
          [83.2, 89.9],
          [79.5, 91.5],
          [58.4, 96.1],
          [37.1, 91.7],
        ],
      },
    ],
  },
  {
    src: "/figma/2-halls/hall-kozhevennaya-34.webp",
    states: "kozhevennaya_34",
    address: "Кожевенная, 34А",
    alt: "Площадка MyWish на Кожевенной линии, 34А",
    at: [534, 192, 373, 560],
    floors: [
      {
        slug: "white",
        shape: [
          [5.2, 19.8],
          [94.8, 19.8],
          [94.8, 42.6],
          [91.8, 43.8],
          [8.2, 43.8],
          [5.2, 42.6],
        ],
      },
      {
        slug: "flamingo",
        shape: [
          [5.2, 42.9],
          [8.2, 43.8],
          [91.8, 43.8],
          [94.8, 42.9],
          [94.8, 68.2],
          [91.7, 69.5],
          [8.3, 69.5],
          [5.2, 68.2],
        ],
      },
      {
        slug: "black",
        shape: [
          [5.2, 68.5],
          [8.3, 69.5],
          [91.7, 69.5],
          [94.8, 68.5],
          [94.8, 91.8],
          [91.6, 93.1],
          [8.4, 93.1],
          [5.2, 91.8],
        ],
      },
    ],
  },
  {
    src: "/figma/2-halls/hall-kachalova-15a.webp",
    states: "kachalova_15a",
    address: "Качалова, 15А",
    alt: "Площадка MyWish на Профессора Качалова, 15А",
    at: [872, 189, 477, 638],
    floors: [
      {
        slug: "leonardo",
        shape: [
          [11.5, 24],
          [66.5, 24.3],
          [66.5, 43.8],
          [61.5, 44.8],
          [52.8, 45.6],
          [26.1, 44.8],
          [11.5, 42.9],
        ],
      },
      {
        slug: "santa-lucia",
        shape: [
          [11.5, 43.5],
          [26.1, 44.9],
          [52.8, 45.7],
          [61.5, 45.2],
          [66.5, 44.5],
          [66.5, 65.7],
          [61.5, 66.6],
          [52.9, 67.3],
          [26, 66],
          [11.5, 63.8],
        ],
      },
      {
        slug: "rubin-hall",
        shape: [
          [11.5, 64.2],
          [26, 66],
          [52.9, 67.4],
          [61.5, 66.7],
          [66.5, 66],
          [66.5, 87.7],
          [61.2, 89.1],
          [48.4, 91.5],
          [25.6, 89.6],
          [11.5, 86.6],
        ],
      },
    ],
  },
];

const HALL_BY_SLUG = Object.fromEntries(
  HALLS.map((hall) => [hall.slug, hall]),
);

/*
  Порядок карточек веера — как дома стоят на экране: слева направо, этажи
  сверху вниз. Поэтому берём его из HOUSES, а не из HALLS: там залы сгруппированы
  по адресам в другом порядке, и веер расходился бы с картинкой над ним.
*/
const FAN_ORDER = HOUSES.flatMap((house) => house.floors.map((floor) => floor.slug));

function shapeToClip(shape: FloorPlacement["shape"]) {
  return `polygon(${shape.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
}


/**
 * Состояния этажа. Их три, и каждое — отдельный нарисованный кадр дома
 * целиком: состояние меняет не только сам этаж (подсветка, красная табличка,
 * галочка), но и соседние — они приглушаются. Поэтому подложка не собирается
 * из фильтров, а подменяется картинкой.
 *
 * Одновременно у дома показывается ровно одно состояние: нажатие важнее
 * наведения, наведение важнее выбора. Иначе кадры наложились бы друг на друга
 * и выиграл бы тот, что ниже в разметке, — то есть случайный.
 */
type FloorState = "hover" | "press" | "selected";

const STATES: FloorState[] = ["hover", "press", "selected"];

function shownState(
  floors: FloorPlacement[],
  { pressSlug, previewSlug, selectedSlug }: {
    pressSlug: string | null;
    previewSlug: string | null;
    selectedSlug: string | null;
  },
): { slug: string; state: FloorState } | null {
  const свой = (slug: string | null) =>
    slug !== null && floors.some((floor) => floor.slug === slug);

  if (свой(pressSlug)) return { slug: pressSlug!, state: "press" };
  if (свой(previewSlug)) {
    /* Наводим на уже выбранный — держим выбор, а не подменяем его наведением. */
    const state = previewSlug === selectedSlug ? "selected" : "hover";
    return { slug: previewSlug!, state };
  }
  if (свой(selectedSlug)) return { slug: selectedSlug!, state: "selected" };
  return null;
}

function HallHouse({
  house,
  activeSlug,
  previewSlug,
  pressSlug,
  selectedSlug,
  onPreview,
  onPress,
}: {
  house: HousePlacement;
  activeSlug: string | null;
  previewSlug: string | null;
  pressSlug: string | null;
  selectedSlug: string | null;
  onPreview: (slug: string | null) => void;
  onPress: (slug: string | null) => void;
}) {
  const isCurrentHouse = house.floors.some(
    (floor) => floor.slug === activeSlug,
  );
  const shown = shownState(house.floors, { pressSlug, previewSlug, selectedSlug });

  return (
    <div
      className="hall-house"
      data-current={isCurrentHouse}
      style={box(...house.at)}
    >
      {/* Базовый рендер: дом, у которого ни один зал не выделен. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={house.src}
        alt={house.alt}
        loading="lazy"
        decoding="async"
        className="hall-house-base"
      />

      {/*
        Девять кадров состояний лежат готовыми и меняют прозрачность. Держать
        их в разметке, а не подставлять src на лету, нужно ради самого первого
        наведения: подставленный кадр пришлось бы ждать, и подсветка появлялась
        бы с опозданием на загрузку. loading="lazy" при этом не даёт им грузиться,
        пока секция далеко от экрана.
      */}
      {house.floors.map((floor) =>
        STATES.map((state) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={floor.slug + state}
            src={`/halls/states/${house.states}/${floor.slug}--${state}.webp`}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="hall-state"
            data-on={shown?.slug === floor.slug && shown.state === state}
          />
        )),
      )}

      {house.floors.map((floor) => {
        const hall = HALL_BY_SLUG[floor.slug];
        const selected = selectedSlug === floor.slug;
        const previewed = previewSlug === floor.slug;
        const active = activeSlug === floor.slug;
        /* Нажатие по выбранному снимает выбор — это же обещает aria-pressed. */
        const action = selected ? "Отменить выбор зала" : "Выбрать зал";

        const style = {
          "--hall-floor-clip": shapeToClip(floor.shape),
        } as CSSProperties;

        return (
          /*
            Кнопка теперь только зона нажатия: всё видимое рисуют кадры выше.
            Форма проёма осталась на ней, потому что clip-path обрезает и
            попадание курсора — по крыше и стенам зал не выбрать.
          */
          <button
            key={floor.slug}
            type="button"
            className="hall-floor"
            data-hall-option={floor.slug}
            data-active={active}
            data-preview={previewed}
            data-selected={selected}
            aria-pressed={selected}
            aria-describedby="halls-instruction"
            aria-label={
              action +
              " «" +
              hall.title +
              "», " +
              house.address +
              ", " +
              hall.area +
              " м²"
            }
            style={style}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") onPreview(floor.slug);
            }}
            onPointerLeave={() => {
              onPreview(null);
              onPress(null);
            }}
            onPointerDown={() => onPress(floor.slug)}
            onPointerUp={() => onPress(null)}
            onPointerCancel={() => onPress(null)}
            onFocus={() => onPreview(floor.slug)}
            onBlur={() => onPreview(null)}
            onClick={() => pickHall(selected ? "" : hall.title)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              pickHall(selected ? "" : hall.title);
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Секция 2 «выбери зал» — Figma 914:1155 … 914:1153.
 * Сцена: макет 1052…1887, на странице — от 96 (макет минус высота hero 956).
 */
export default function Halls() {
  const order = useOrder();
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [pressSlug, setPressSlug] = useState<string | null>(null);
  const selectedHall = HALLS.find((hall) => hall.title === order.hall) ?? null;
  const selectedSlug = selectedHall?.slug ?? null;
  const activeSlug = previewSlug ?? selectedSlug;
  /*
    Подпись ведёт только курсор. Раньше она смотрела на activeSlug, куда
    входит и сделанный выбор, — и после нажатия строка про зал оставалась
    висеть, хотя курсор давно ушёл.
  */
  const hoverHall = previewSlug ? HALL_BY_SLUG[previewSlug] : null;
  const hoverHouse = previewSlug
    ? HOUSES.find((house) =>
        house.floors.some((floor) => floor.slug === previewSlug),
      )
    : null;

  /*
    Подпись рассказывает только про наведение. Сделанный выбор она не
    повторяет: его видно на самом доме — красная табличка с галочкой — и в
    «Итого» ниже. Снимается выбор повторным нажатием по тому же залу, о чём
    подпись и говорит, пока курсор на нём.
  */
  let instruction =
    "Все залы стоят одинаково. Наведи на этаж и нажми, чтобы выбрать.";
  if (hoverHall) {
    instruction =
      hoverHall.title +
      " · " +
      hoverHall.area +
      " м² · " +
      hoverHouse?.address +
      (hoverHall.slug === selectedSlug
        ? " — нажми ещё раз, чтобы отменить"
        : selectedHall
          ? " — нажми, чтобы сменить выбор"
          : " — нажми, чтобы выбрать");
  }

  return (
    <section
      id="halls"
      data-section="halls"
      data-step="hall"
      className="halls-section u-snap"
      data-has-active={Boolean(activeSlug)}
      style={box(0, 96, 1440, 835)}
    >
      <div className="halls-interface-layer">
        <SectionHeading
          node="914:1156"
          at={[340, 25, 699, 140]}
          accent="под стиль праздника"
        >
          Выбери зал
        </SectionHeading>

        {/* Стикер над заголовком 914:1157 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/2-halls/sticker.webp"
          alt=""
          aria-hidden
          className="u-step-sticker max-w-none"
          style={{ ...box(469, 4, 42, 40), transform: "rotate(-11.88deg)" }}
        />

        {/*
          Галочка выполненного шага: та же картинка на всех четырёх шагах и
          ровно на месте стикера — они сменяют друг друга, а не соседствуют.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/steps/done.webp"
          alt=""
          aria-hidden
          loading="lazy"
          className="u-step-check max-w-none"
          style={{ ...box(469, 4, 42, 40), transform: "rotate(-11.88deg)" }}
        />
        <StepDone step="hall" at={[469, 4, 42, 40]} />

        <p
          id="halls-instruction"
          className="u-lede halls-instruction"
          data-active={Boolean(hoverHall)}
          style={box(330, 178, 780, 28)}
        >
          {instruction}
        </p>

        <p className="u-visually-hidden" role="status" aria-live="polite">
          {selectedHall ? "Выбран зал «" + selectedHall.title + "»." : ""}
        </p>

      </div>

      <div className="halls-houses-layer">
        {HOUSES.map((house) => (
          <HallHouse
            key={house.src}
            house={house}
            activeSlug={activeSlug}
            previewSlug={previewSlug}
            pressSlug={pressSlug}
            selectedSlug={selectedSlug}
            onPreview={setPreviewSlug}
            onPress={setPressSlug}
          />
        ))}

        {/*
          В DOM действие идёт после девяти вариантов: так клавиатура и скринридер
          сначала проходят сам выбор, а уже затем «Все залы».
        */}
        <div className="halls-actions" style={box(497, 758, 446, 45)}>
          {/*
            Веер живых фотографий из-под кнопки: по одной заглавной карточке
            на каждый зал. Без него «Все залы» — просто надпись, и неочевидно,
            что за ней настоящие снимки, а не список названий.

            Карточки лежат в обёртке вместе с кнопкой, а не рядом с ней:
            наведение слушает обёртка, поэтому веер не схлопывается, когда
            курсор заезжает на сами карточки.
          */}
          <div className="halls-all">
            <span aria-hidden className="halls-fan">
              {FAN_ORDER.map((slug, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={slug}
                  src={`/halls/${slug}/fan.webp`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  /* Место в ряду: поворот, порядок наложения и очередь
                     раскрытия CSS считает по нему. */
                  style={{ "--i": i } as React.CSSProperties}
                />
              ))}
            </span>
            <Link href="/halls" className="u-cta halls-action halls-action-all">
              ВСЕ ЗАЛЫ
            </Link>
          </div>
        </div>
      </div>

      {/* Ниже 1024 — один дом за раз: табы, свайп, карточка зала (mobile.css). */}
      <HallsMobile />
    </section>
  );
}
