import SectionHeading from "./SectionHeading";
import { box, px } from "@/lib/px";

/**
 * Секция 5 «один человек на весь праздник» — Figma 914:1186 … 914:1211.
 * Сцена: макет 4160…4820 → 3204 на странице.
 *
 * Секция лежит на тёмной подложке (988:30 в декоративном слое), поэтому
 * заголовок и подзаголовок здесь белые — так в макете.
 *
 * Карточка-переписка 914:1188 собрана вёрсткой, а не картинкой: это реальный
 * текст о сервисе. Кегли внутри дробные (16.5 / 17.5 / 13.4) — блок вставлен
 * в макет в масштабе ≈0.77, значения оставлены как в макете.
 */

/**
 * Сообщения идут потоком, а не по координатам макета: текст живой, и в
 * разных браузерах строка может лечь иначе. На фиксированной высоте лишняя
 * строка вылезала из пузыря — теперь пузырь просто становится выше, а
 * следующие сдвигаются вниз. Ширины и отступы при этом макетные.
 */
type Bubble = { text: string; time: string; out?: true };

const CHAT: Bubble[] = [
  {
    text: "Привет! Я Лада, твой менеджер. Буду с тобой до самого праздника.",
    time: "10:02",
  },
  {
    text: "Подскажу свободные даты, помогу выбрать зал и пакет. Вместе соберём меню, оформление и приглашения для гостей.",
    time: "10:02",
  },
  { text: "А если что-то поменяется?", time: "10:05", out: true },
  {
    text: "Всё решим, я на связи. Проверю, что к празднику всё готово, встречу тебя в день Х и останусь на связи после.",
    time: "10:06",
  },
];

/** Пузырь: 535×72 входящий и 285×47 исходящий, поля 16 / 12 / 10. */
const IN = { w: 535, minH: 72, timeRight: 19, timeBottom: 9 };
const OUT = { w: 285, minH: 47, timeRight: 16, timeBottom: 8 };

const MSG = { fontSize: px(16.5), lineHeight: px(24.7) };
const TIME = { fontSize: px(12.4), lineHeight: px(18.5) };

export default function Manager() {
  return (
    <section id="manager" data-section="manager" style={box(0, 3204, 1440, 660)}>
      <SectionHeading
        size="l"
        node="914:1186"
        at={[502, 0, 473, 100]}
        accent=" на весь праздник"
        className="text-surface"
      >
        Один человек
      </SectionHeading>

      <p className="u-lede text-surface" data-node-id="914:1187" style={box(366, 116, 745, 28)}>
        В каждом пакете с тобой личный менеджер — один и тот же, всегда рядом.
      </p>

      {/*
        914:1185 «image 109» (379×514) в макете пустой — ассета нет.
        Когда фото появится, оно встаёт на box(622, 150, 379, 514).
      */}

      {/* Карточка-переписка 914:1188 */}
      <div
        data-node-id="914:1188"
        className="manager-desktop-card rounded-lg bg-surface"
        style={{
          ...box(277, 164, 659),
          minHeight: px(429),
          boxShadow: "var(--shadow-card-lg)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/manager/avatar.webp"
          alt=""
          aria-hidden
          className="max-w-none rounded-pill"
          style={box(26, 24, 49, 49)}
        />
        <p
          className="font-sans font-bold text-ink"
          style={{ ...box(88, 26, 190, 21), fontSize: px(17.5), lineHeight: px(21) }}
        >
          Лада · твой менеджер
        </p>
        <span
          aria-hidden
          className="rounded-pill"
          style={{ ...box(88, 57, 7, 7), background: "#24723c" }}
        />
        <p
          className="font-sans"
          style={{ ...box(101, 51, 190, 18), fontSize: px(13.4), color: "#24723c" }}
        >
          Пример общения
        </p>

        {/* Лента сообщений 914:1198 … 914:1208 */}
        <div
          style={{
            ...box(26, 107, 607),
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: px(11),
          }}
        >
          {CHAT.map((b) => {
            const m = b.out ? OUT : IN;
            return (
              <div
                key={b.time + b.text.slice(0, 12)}
                className={b.out ? "bg-blush" : "bg-surface-alt"}
                style={{
                  position: "relative",
                  width: px(m.w),
                  minHeight: px(m.minH),
                  alignSelf: b.out ? "flex-end" : "flex-start",
                  padding: `${px(12)} ${px(16)} ${px(10)}`,
                  borderRadius: b.out
                    ? `${px(16)} ${px(16)} ${px(4)} ${px(16)}`
                    : `${px(16)} ${px(16)} ${px(16)} ${px(4)}`,
                }}
              >
                <p className="font-sans text-ink" style={MSG}>
                  {b.text}
                </p>
                <p
                  className="font-sans text-muted"
                  style={{
                    position: "absolute",
                    right: px(m.timeRight),
                    bottom: px(m.timeBottom),
                    ...TIME,
                  }}
                >
                  {b.time}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/*
        Персонаж идёт после карточки: в макете он лежит поверх неё —
        указывающий палец заходит на белый угол переписки.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/manager/photo.webp"
        alt="Лада, менеджер MyWish"
        data-node-id="914:1211"
        loading="lazy"
        className="max-w-none"
        style={box(894, 150, 306, 459)}
      />

      {/* Mobile composition: the approved phone-and-hand PNG is cropped by its wrapper. */}
      <div className="manager-mobile-visual" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/manager/phone-hand-chat.webp"
          alt=""
          loading="lazy"
          className="manager-mobile-phone"
        />
      </div>
    </section>
  );
}
