import SectionHeading from "./SectionHeading";
import PickPackage from "./PickPackage";
import FoodMenuModal, { type FoodSetItem } from "./FoodMenuModal";
import PackagesChoice from "./PackagesChoice";
import PackagesLede from "./PackagesLede";
import PackagesCarousel from "./PackagesCarousel";
import StepDone from "./StepDone";
import { box, px } from "@/lib/px";
import { getPackage, money, type PackageId } from "@/lib/pricing";

/**
 * Секция 6 «выбери пакет» — Figma 914:1239 … 914:1310.
 * Сцена: макет 4854…5794 → 3898 на странице.
 *
 * Три карточки 325×618 стоят на 130 / 557 / 984 (зазор 102) — выровнены
 * в макете, поэтому здесь одна разметка на все три, отличаются только
 * цветовая схема, картинка и список.
 */

type Theme = {
  bg: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  /** Пара для наведения — контрастная к фону самой карточки. */
  badgeBgHover: string;
  badgeTextHover: string;
  rule: string;
};

const THEMES: Record<PackageId, Theme> = {
  happy: {
    bg: "var(--color-blush)",
    text: "var(--color-ink)",
    badgeBg: "var(--color-primary)",
    badgeText: "var(--color-blush)",
    badgeBgHover: "var(--color-navy)",
    badgeTextHover: "var(--color-surface)",
    rule: "#000000",
  },
  extra: {
    /*
      Фирменный красный, как в макете, у пилюли «Экстра» и у банта. Тёмный
      #ba2e43 на его месте рядом с ними читался как другой оттенок — будто
      на карточке градиент. Текст белый, а не розовый из макета: мелкие
      строки на красном так читаются лучше.
    */
    bg: "var(--color-primary)",
    text: "var(--color-surface)",
    badgeBg: "var(--color-blush)",
    badgeText: "var(--color-primary)",
    badgeBgHover: "var(--color-navy)",
    badgeTextHover: "var(--color-surface)",
    rule: "var(--color-blush)",
  },
  wow: {
    bg: "var(--color-navy)",
    text: "var(--color-surface)",
    badgeBg: "var(--color-surface)",
    badgeText: "var(--color-navy)",
    badgeBgHover: "var(--color-primary)",
    badgeTextHover: "var(--color-blush)",
    rule: "var(--color-surface)",
  },
};

/**
 * Общий для всех пакетов список — позиции 155…231 в макете.
 *
 * Два первых пункта уводят к своим секциям выше. Это не выдумка: в макете
 * подчёркнуты ровно они (линии 135 и 39 px под «Личный менеджер» и «Reels»),
 * а ширина нашего текста совпала — 133.6 и 39. То есть подчёркивание там и
 * задумано как признак ссылки. У остальных трёх пунктов своей секции на
 * странице нет, поэтому они остаются обычным текстом.
 */
const BASE: { text: string; href?: string; icon?: "heart" | "play" }[] = [
  { text: "Личный менеджер", href: "#manager", icon: "heart" },
  { text: "Reels", href: "#reels", icon: "play" },
  { text: "Фото на бокалы" },
  { text: "Электронные пригласительные" },
  { text: "Безлимит льда" },
];

const BASE_Y = [155, 174, 193, 212, 231];

function PackageLinkIcon({ kind }: { kind: "heart" | "play" }) {
  return kind === "heart" ? (
    <svg viewBox="0 0 16 16" aria-hidden fill="none">
      <path d="M8 13.2S2.5 10.1 2.5 6.1A2.8 2.8 0 0 1 8 5.2a2.8 2.8 0 0 1 5.5.9c0 4-5.5 7.1-5.5 7.1Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="m6.7 5.6 3.8 2.4-3.8 2.4V5.6Z" fill="currentColor" />
    </svg>
  );
}

type Card = {
  node: string;
  x: number;
  theme: PackageId;
  name: string;
  price: string;
  priceX: number;
  nameX: number;
  lede: string;
  bullets: string[];
  food: { deposit: string; tableImage: string; items: FoodSetItem[] };
  extras: string[];
  img: {
    file: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

const CARDS: Card[] = [
  {
    node: "914:1242",
    x: 130,
    theme: "happy",
    name: "«Хэппи»",
    nameX: 110,
    price: money(getPackage("happy").price),
    priceX: 110,
    lede: "База, в которой есть всё нужное для хорошего праздника.",
    bullets: ["• 2 микрофона", "• Сервировка стандарт"],
    food: {
      deposit: "13 100 ₽",
      tableImage: "/packages/food/happy/table.webp",
      items: [
        { name: "Бокс ассорти салатов", price: "3 900 ₽", image: "/packages/food/happy/salad-box.png" },
        { name: "Бокс круассанов ассорти", price: "4 800 ₽", image: "/packages/food/happy/croissants.png" },
        { name: "Фруктовый микс", price: "4 400 ₽", image: "/packages/food/happy/fruit-mix.png" },
      ],
    },
    extras: [],
    img: { file: "p1", x: 103, y: 401, w: 119, h: 178 },
  },
  {
    node: "914:1263",
    x: 557,
    theme: "extra",
    name: "«Экстра»",
    nameX: 104,
    price: money(getPackage("extra").price),
    priceX: 109,
    lede: "Всё нужное и чуть больше — чтобы совсем ни о чём не думать.",
    bullets: ["• 4 микрофона", "• Сервировка полная"],
    food: {
      deposit: "17 400 ₽",
      tableImage: "/packages/food/extra/table.webp",
      items: [
        { name: "Фруктовый микс", price: "4 400 ₽", image: "/packages/food/extra/fruit-mix.png" },
        { name: "Королева брускетт вечеринок", price: "4 800 ₽", image: "/packages/food/extra/bruschetta.png" },
        { name: "О чём говорят женщины", price: "4 600 ₽", image: "/packages/food/extra/women-talk.png" },
        { name: "Моносет с рулетиками", price: "3 600 ₽", image: "/packages/food/extra/rolls.png" },
      ],
    },
    extras: ["+1ч технического времени", "+Официант 5ч"],
    img: { file: "p2", x: 111, y: 407, w: 102, h: 172 },
  },
  {
    node: "914:1284",
    x: 984,
    theme: "wow",
    name: "«Вау»",
    nameX: 126,
    price: money(getPackage("wow").price),
    priceX: 103,
    lede: "Максимум — когда хочется, чтобы запомнилось всем.",
    bullets: ["• 4 микрофона", "• Сервировка премиум"],
    food: {
      deposit: "26 600 ₽",
      tableImage: "/packages/food/wow/table.webp",
      items: [
        { name: "Фруктовый микс", price: "4 400 ₽", image: "/packages/food/wow/fruit-mix.png" },
        { name: "Ассорти сыров", price: "5 000 ₽", image: "/packages/food/wow/cheese.png" },
        { name: "О чём говорят женщины", price: "4 600 ₽", image: "/packages/food/wow/women-talk.png" },
        { name: "Королева брускетт вечеринок", price: "4 800 ₽", image: "/packages/food/wow/bruschetta.png" },
        { name: "Бокс ассорти салатов", price: "3 900 ₽", image: "/packages/food/wow/salad-box.png", count: 2 },
        { name: "Ассорти канапе", price: "3 900 ₽", image: "/packages/food/wow/canape.png" },
      ],
    },
    extras: [
      "+1ч технического времени",
      "+Официант 5ч",
      "+Welcome фото-зона",
      "+Фотограф 2ч",
      "+Шоу-программа (Ведущий 2ч + DJ 3ч)",
    ],
    img: { file: "p3", x: 104, y: 435, w: 118, h: 152 },
  },
];

/**
 * Пункт состава с маркером из макета («• », «+») отдельным span: на десктопе
 * текст выглядит как прежде, а на телефоне маркер заменяет значок (mobile.css).
 */
function Marked({ text }: { text: string }) {
  const match = /^([•+]\s?)(.*)$/.exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      <span className="u-package-mark">{match[1]}</span>
      {match[2]}
    </>
  );
}

export default function Packages() {
  return (
    <section
      id="packages"
      data-section="packages"
      data-step="package"
      className="u-snap"
      /*
        Коробка 860, а не макетные 940: вместе с запасом якоря (72) она должна
        помещаться в экран. Иначе браузер считает блок «длиннее экрана» и
        притягивает его не только верхом, но и низом — заголовок при этом
        уезжает под шапку. Содержимое кончается на 859, так что подрезано
        только пустое дно.
      */
      style={box(0, 3898, 1440, 860)}
    >
      <SectionHeading
        node="914:1239"
        at={[332, 25, 774, 140]}
        accent="под формат праздника"
      >
        Выбери пакет
      </SectionHeading>

      {/* Стикер над заголовком — image 84 в группе 914:1239 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/packages/heading-sticker.webp"
        alt=""
        aria-hidden
        className="u-step-sticker max-w-none"
        style={{ ...box(457, 4, 44, 41), transform: "rotate(-12.04deg)" }}
      />

      {/* Галочка выполненного шага — на месте стикера, см. StepDone. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/steps/done.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="u-step-check max-w-none"
        style={{ ...box(457, 4, 44, 41), transform: "rotate(-12.04deg)" }}
      />
      <StepDone step="package" at={[457, 4, 44, 41]} />

      {/* Подпись живая: под курсором рассказывает про карточку (PackagesLede). */}
      <PackagesLede />

      {/*
        Выбранный пакет отмечается признаком на самой секции — его ставит
        PackagesChoice. Секция серверная, а выбор живёт в черновике заказа на
        клиенте; признак на общем предке — единственный способ рассказать об
        этом сразу трём карточкам, не превращая их в клиентские.
      */}
      <PackagesChoice />

      {/*
        Ниже 1024 — лента по одной карточке, как выбор зала (PackagesCarousel);
        на десктопе обёртка прозрачна, карточки стоят на координатах макета.
      */}
      <PackagesCarousel
        labels={CARDS.map((c) => c.name.replace(/[«»]/g, ""))}
        themes={CARDS.map((c) => c.theme)}
        ribbon={CARDS.findIndex((c) => c.theme === "extra")}
        initial={CARDS.findIndex((c) => c.theme === "extra")}
      >
      {CARDS.map((c) => {
        const t = THEMES[c.theme];
        return (
          <article
            key={c.node}
            data-node-id={c.node}
            data-package={c.theme}
            className="u-package-card overflow-hidden rounded-card"
            style={{
              ...box(c.x, 241, 325, 618),
              background: t.bg,
              color: t.text,
            }}
          >
            {/*
              Название и цена. На десктопе обёртка прозрачна — оба стоят на
              координатах макета; на телефоне это одна строка: название слева,
              цена справа (mobile.css), — карточка ниже на строку.
            */}
            <div className="u-package-head contents">
            <h3
              className="u-package-name font-sans font-bold"
              style={{ ...box(c.nameX, 14, undefined, 34), fontSize: px(25) }}
            >
              {c.name}
            </h3>
            <p
              className="u-package-price font-sans font-extrabold"
              style={{
                ...box(c.priceX, 48, undefined, 35),
                fontSize: px(25.4),
              }}
            >
              {c.price}
            </p>
            </div>

            {/* Line 1 — разделитель под ценой */}
            <span
              aria-hidden
              className="u-package-rule"
              style={{
                ...box(27, 83, 270, 0),
                borderTop: `${px(0.7)} solid ${t.rule}`,
              }}
            />

            <p
              className="u-package-lede font-sans font-medium"
              style={{ ...box(26, 91, 273, 53), fontSize: px(15) }}
            >
              {c.lede}
            </p>

            {/*
              Подчёркивание у ссылок — не отдельная линия по координатам, как
              было, а псевдоэлемент самой ссылки: он встаёт на ту же макетную
              высоту, но тянется ровно по тексту и отзывается на наведение
              вместе с ним. Линии 914-го макета (135 и 39) им и заменены.
            */}
            {/*
              Состав — три группы: общее для всех пакетов, еда и сервировка,
              добавки пакета. На десктопе группы прозрачны (display: contents),
              пункты стоят на координатах макета; на телефоне это плашки.
              Общее для всех пакетов (u-package-base) на телефоне — чипами.
            */}
            <div className="u-package-group u-package-base contents">
            {BASE.map((item, i) =>
              item.href ? (
                <a
                  key={item.text}
                  href={item.href}
                  className="u-package-link font-sans font-medium"
                  style={{
                    ...box(32, BASE_Y[i], undefined, 23),
                    fontSize: px(15),
                  }}
                >
                  <span className="u-package-link-label">{item.text}</span>
                  <span className="u-package-link-icon">
                    <PackageLinkIcon kind={item.icon!} />
                  </span>
                </a>
              ) : (
                <p
                  key={item.text}
                  className="font-sans font-medium"
                  style={{
                    ...box(32, BASE_Y[i], undefined, 20),
                    fontSize: px(15),
                  }}
                >
                  {item.text}
                </p>
              ),
            )}
            </div>

            <div className="u-package-group u-package-own contents">
            <span style={box(32, 265, 261, 22)}>
              <FoodMenuModal
                packageName={c.name}
                deposit={c.food.deposit}
                tableImage={c.food.tableImage}
                items={c.food.items}
              />
            </span>

            {c.bullets.map((item, i) => (
              <p
                key={item}
                className="font-sans font-medium"
                style={{
                  ...box(32, 291 + i * 19, undefined, 20),
                  fontSize: px(15),
                }}
              >
                <Marked text={item} />
              </p>
            ))}
            </div>

            {/*
              Добавки. Группа есть у всех карточек: на телефоне у «Хэппи» на её
              месте строка «Без дополнительных опций» — блоки стоят одинаково и
              пакеты сравниваются построчно. На десктопе строка скрыта.
            */}
            <div className="u-package-group u-package-extras contents">
            {c.extras.length ? c.extras.map((item, i) => (
              <p
                key={item}
                className="font-sans font-medium"
                style={{
                  ...box(32, 340 + i * 19, i === 4 ? 188 : undefined, 20),
                  fontSize: px(15),
                }}
              >
                <Marked text={item} />
              </p>
            )) : (
              <p className="u-package-empty font-sans font-medium">
                Без дополнительных опций
              </p>
            )}
            </div>

            {/*
              Подвал карточки: Руби и кнопка. На телефоне Руби скрыт, а подвал
              прижимает кнопку к низу карточки (mobile.css).
            */}
            <div className="u-package-foot contents">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/figma/packages/${c.img.file}.webp`}
              alt=""
              aria-hidden
              loading="lazy"
              className="u-package-mascot max-w-none"
              style={box(c.img.x, c.img.y, c.img.w, c.img.h)}
            />

            <PickPackage
              id={c.theme}
              style={
                {
                  /*
                    Ширина 134, а не макетные 100: в выбранном состоянии в
                    пилюле стоит галочка, и на сотне текст прижимался к
                    правому краю. Коробка сдвинута влево на те же 17, чтобы
                    центр остался на месте.
                  */
                  ...box(96, 568, 134, 28.5),
                  "--chip-bg": t.badgeBg,
                  "--chip-fg": t.badgeText,
                  "--chip-bg-hover": t.badgeBgHover,
                  "--chip-fg-hover": t.badgeTextHover,
                  fontSize: px(20),
                } as React.CSSProperties
              }
            />
            </div>
          </article>
        );
      })}
      </PackagesCarousel>

      {/*
        Бант «наш выбор» 914:1310 — идёт после карточек, потому что в макете
        он лежит поверх угла «Экстры», а не под ним.

        В макете нода 142.4 × 94.9 повёрнута на 51.03°, и её габарит — те самые
        163 × 170. Поворот делает CSS, а не растр: запечённый поворот пришлось
        бы вырезать по порогу, и на красной карточке по краю оставалась белая
        кайма. Коробка ниже — неповёрнутая нода, поставленная центром в центр
        габарита (499 + 163/2, 182 + 170/2).
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/packages/sticker.webp"
        alt=""
        aria-hidden
        className="max-w-none"
        style={{
          /*
            Бант держится за верхний край «Экстры» и стоит на макетной
            координате. Однажды я поднял карточки, забыв про него, и он уехал
            на подзаголовок — если карточки снова поедут, этот угол едет с ними.
          */
          ...box(509.3, 219.5, 142.392, 94.928),
          transform: "rotate(-51.028deg)",
        }}
      />
    </section>
  );
}
