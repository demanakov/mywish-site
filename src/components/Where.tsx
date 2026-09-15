import Link from "next/link";
import { LOCATIONS, HALLS } from "@/lib/halls.mjs";
import SectionHeading from "./SectionHeading";
import YandexMap from "./YandexMap";
import WhereMobile from "./WhereMobile";
import { box, px } from "@/lib/px";

/**
 * Секция 10 «где проходит праздник» — Figma 914:2017 … 914:2007.
 * Сцена: макет 8509…9125 → 7553 на странице.
 *
 * На месте картинки из макета (914:1905) стоит живая карта Яндекса с
 * метками трёх площадок. Координаты блока — макетные.
 */

type Address = {
  node: string;
  n: string;
  title: string;
  metro: string;
  halls: string;
  y: number;
  /** Строка с рейтингом и «хорошим местом» — картинкой, как в макете. */
  rating: { file: string; at: [number, number, number, number] };
  /** Карточка места на Яндекс.Картах. */
  map: string;
  /** Якорь этой площадки на странице залов. */
  slug: string;
};

const ADDRESS_LAYOUT: Omit<Address, "title" | "metro" | "map" | "halls">[] = [
  {
    node: "914:1987",
    n: "1",
    y: 182,
    rating: { file: "rating-1", at: [61, 52, 228, 15] },
    slug: "kozhevennaya-34",
  },
  {
    node: "914:1997",
    n: "2",
    y: 329,
    rating: { file: "rating-2", at: [61, 49, 228, 22] },
    slug: "kachalova-8",
  },
  {
    node: "914:2007",
    n: "3",
    y: 477,
    rating: { file: "rating-3", at: [60, 52, 228, 16] },
    slug: "kachalova-15",
  },
];
const ADDRESSES: Address[] = ADDRESS_LAYOUT.map(layout => {
  const location = LOCATIONS.find(item => item.slug === layout.slug)!;
  return { ...layout, title: location.title, metro: location.metro, map: location.map, halls: HALLS.filter(hall => hall.location === layout.slug).map(hall => hall.title).join(" · ") };
});


export default function Where() {
  return (
    <section id="where" data-section="where" style={box(0, 7553, 1440, 616)}>
      <SectionHeading size="l" node="914:2017" at={[532, 0, 340, 100]} accent=" праздник">
        Где проходит
      </SectionHeading>

      <p className="u-lede" data-node-id="914:2018" style={box(393, 127, 654, 28)}>
        Три адреса, где можно гулять до утра и шуметь без ограничений.
      </p>

      {/* Карта 914:1905 — живая, с метками трёх площадок */}
      <YandexMap
        nodeId="914:1905"
        className="overflow-hidden rounded-lg"
        style={box(130, 182, 713, 434)}
      />

      <ul className="contents">
        {ADDRESSES.map((a, i) => (
          <li
            key={a.node}
            data-node-id={a.node}
            className="rounded-lg"
            style={{
              ...box(854, a.y, 456, 139),
              background: i === 1 ? "var(--color-surface-alt)" : "var(--color-page)",
            }}
          >
            <span
              aria-hidden
              className="flex items-center justify-center rounded-pill bg-primary font-sans font-bold text-surface"
              style={{ ...box(18, 41, 32, 32), fontSize: px(13.6) }}
            >
              {a.n}
            </span>
            {/*
              Коробка 292, а не макетные 251: наш шрифт шире фигмовского, и
              «Профессора Качалова, 15А» (283) переносился второй строкой прямо
              на строку с метро. 292 — всё место до кнопки «Залы».
            */}
            <p
              className="whitespace-nowrap font-sans text-ink"
              style={{ ...box(62, 25, 292, 27), fontSize: px(23.7), lineHeight: px(24.7), letterSpacing: px(-0.83) }}
            >
              {a.title}
            </p>
            {/*
              Рейтинг и «Хорошее место» — картинкой из макета: это скриншот
              плашек Яндекса со своими иконками и шрифтом. Фон в неё запечён,
              и он совпадает с фоном карточки, так что стыка не видно.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/figma/where/${a.rating.file}.webp`}
              alt=""
              aria-hidden
              loading="lazy"
              className="max-w-none"
              style={box(...a.rating.at)}
            />

            <p
              className="font-sans text-ink-muted"
              style={{ ...box(62, 73, 260, 13), fontSize: px(9.3) }}
            >
              {a.metro}
            </p>
            <p
              className="font-sans text-ink-muted"
              style={{ ...box(62, 92, 260, 12), fontSize: px(8.5) }}
            >
              {a.halls}
            </p>
            {/*
              Ведёт не просто на страницу залов, а сразу на эту площадку:
              якорь совпадает со slug площадки в src/lib/halls.mjs.
            */}
            <Link
              href={`/halls#${a.slug}`}
              className="u-halls-link flex items-center justify-center rounded-pill font-sans font-bold"
              style={{ ...box(354, 40, 84, 34), fontSize: px(11) }}
            >
              Залы
            </Link>

            <a
              href={a.map}
              target="_blank"
              rel="noopener noreferrer"
              className="u-maplink inline-flex items-center rounded-pill border border-border-soft font-sans font-bold text-ink"
              style={{
                position: "absolute",
                left: px(61),
                top: px(107),
                height: px(26),
                paddingInline: px(12),
                fontSize: px(10),
              }}
            >
              Посмотреть на карте
              <svg
                viewBox="0 0 10 10"
                aria-hidden
                fill="none"
                style={{ width: px(9), marginLeft: px(6) }}
              >
                <path
                  d="M2 8 8 2M3.4 2H8v4.6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </li>
        ))}
      </ul>

      {/* Ниже 1024 — статичная карта с метками и карточка площадки (mobile.css). */}
      <WhereMobile />
    </section>
  );
}
