"use client";
import { useHydrated } from "@/lib/useHydrated";

import { useEffect, useRef, useState } from "react";
import {
  formatMessenger,
  formatPhone,
  normalizeMessenger,
  normalizePhone,
} from "@/lib/contact-input";
import { CONTACTS } from "@/lib/contacts";
import SectionHeading from "./SectionHeading";
import StepDone from "./StepDone";
import { box, px } from "@/lib/px";
import { markSent, pickHall, resetDraft, useOrder, setOrder } from "@/lib/order";
import { MONTHS_OF, getPackage, money, totalOf } from "@/lib/pricing";
import { LEGAL, type LegalId } from "@/lib/legal";
import { HALL_TITLES as HALLS } from "@/lib/halls.mjs";
import LegalModal from "./LegalModal";
import { buildLead, FORM_ID, isAcceptedLead } from "@/lib/lead-payload.mjs";
import { clientId, goal } from "@/lib/analytics";
import { resolveAttribution, sourceBucketFromAttribution } from "@/lib/attribution.mjs";

/**
 * Секция 8 «заполни детали своего праздника» — Figma 914:1861 … 914:1802.
 * Сцена: макет 6839…7756 → 5883 на странице.
 *
 * Форма собрана настоящими полями: поля, чекбокс и кнопка — реальные элементы,
 * привязанные к подписям, чтобы её оставалось только подключить к бэкенду.
 * Блок вставлен в макет в масштабе 0.8305 — кегли дробные, как в макете.
 */

/*
  Девять залов берём из общего источника. Раньше список лежал здесь копией и
  в своём написании — «Блек» против «Блэк» на странице залов. Пока зал выбирали
  только тут, это не мешало; теперь его выбирают на /halls и переносят сюда, и
  при расхождении <select> не нашёл бы совпадения и показал пустое поле.
*/

/**
 * Гостей считают с запасом, поэтому вилки, а не точное число.
 *
 * Подписи короткие: на телефоне список стоит в половину ширины рядом с залом,
 * и «больше 30 человек» обрезалось. Над полем подпись «Сколько гостей», так
 * что «чел.» читается однозначно.
 */
const GUESTS = [
  "до 5 чел.",
  "до 10 чел.",
  "до 15 чел.",
  "до 20 чел.",
  "до 25 чел.",
  "до 30 чел.",
  "больше 30 чел.",
];

const CHEVRON = (
  <svg
    viewBox="0 0 10 6"
    aria-hidden
    fill="none"
    className="pointer-events-none absolute"
    style={{ right: px(14), top: "50%", width: px(10), marginTop: px(-3) }}
  >
    <path
      d="M1 1l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function RequestForm() {
  const order = useOrder();

  const name = order.name;
  const setName = (value: string) => setOrder({ name: value });
  const guests = order.guests;
  const setGuests = (value: string) => setOrder({ guests: value });
  const phone = order.phone;
  const setPhone = (value: string) => setOrder({ phone: value });
  const messenger = order.messenger;
  const setMessenger = (value: string) => setOrder({ messenger: value });
  const wish = order.wish;
  const setWish = (value: string) => setOrder({ wish: value });
  const hydrated = useHydrated();
  const [consent, setConsent] = useState(false);
  /** Телефон: раскрыто ли необязательное поле пожелания. */
  const [extras, setExtras] = useState(false);
  const [missing, setMissing] = useState({
    name: false,
    phone: false,
    messenger: false,
    consent: false,
  });
  /** Документ, открытый поверх формы: то же окно, что и в подвале. */
  const [legal, setLegal] = useState<LegalId | null>(null);
  /* Курсор на кнопке отправки: по нему живёт подсказка под заголовком. */
  const [aiming, setAiming] = useState(false);

  /** Заявка ушла — форму накрывает подтверждение (.rf-success). */
  const [thanks, setThanks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const sendingRef = useRef(false);
  const requestIdRef = useRef("");
  const websiteRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const thanksRef = useRef<HTMLHeadingElement>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);
  /**
   * Момент отметки согласия. Документ обещает, что вместе с заявкой
   * сохраняются его версия и время отметки, — значит это надо не вычислять
   * при отправке, а запомнить именно тогда, когда человек поставил галочку.
   */
  const consentAtRef = useRef<string | null>(null);

  const normalizedPhone = normalizePhone(phone);
  const phoneReady = normalizedPhone !== null;
  const normalizedMessenger = normalizeMessenger(messenger);
  const nameReady = name.trim().length > 0;

  /** Перезапуск анимации: без снятия класса второй промах прошёл бы молча. */
  function shake(el: HTMLElement | null) {
    if (!el) return;
    el.classList.remove("u-shake");
    void el.offsetWidth;
    el.classList.add("u-shake");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sendingRef.current || thanks) return;
    setSubmitError("");
    const bad = { name: !nameReady, phone: !phoneReady, messenger: normalizedMessenger === null, consent: !consent };
    setMissing(bad);

    /*
      Кнопка остаётся живой, даже когда чего-то не хватает: заблокированная
      кнопка молча не нажимается и не объясняет причину. Промах показываем
      отказом — тряской поля и подписью под кнопкой.
    */
    if (bad.name || bad.phone || bad.messenger || bad.consent) {
      if (bad.name) shake(nameRef.current);
      if (bad.phone) shake(phoneRef.current);
      if (bad.consent) shake(consentRef.current);
      const first = bad.name
        ? nameRef.current
        : bad.phone
          ? phoneRef.current
          : bad.messenger
            ? document.getElementById("messenger")
            : consentRef.current?.querySelector<HTMLInputElement>("#consent");
      first?.focus();
      return;
    }

    sendingRef.current = true;
    setSubmitting(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      let storage: Storage | undefined;
      try { storage = sessionStorage; } catch { /* Optional storage. */ }
      if (!requestIdRef.current) {
        let saved: string | null | undefined;
        try { saved = storage?.getItem("mywish.main.request-id"); } catch { /* optional */ }
        requestIdRef.current = saved && /^[a-zA-Z0-9_-]{16,80}$/.test(saved)
          ? saved : crypto.randomUUID();
        try { storage?.setItem("mywish.main.request-id", requestIdRef.current); } catch { /* Retry uses the in-memory id. */ }
      }
      const attribution = resolveAttribution(window.location.search, storage);
      const payload = buildLead(order, getPackage(order.pkg), normalizedPhone, attribution, {
        requestId: requestIdRef.current,
        consentAt: consentAtRef.current,
        messenger: normalizedMessenger,
        website: websiteRef.current?.value || "",
        total,
        path: window.location.pathname,
      });
      const response = await fetch("/api/leads.php", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ym_client_id: await clientId() }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !isAcceptedLead(result)) {
        throw new Error(response.status === 400 ? "Проверь данные и повтори отправку." : "Не удалось отправить. Повтори попытку или позвони нам.");
      }
      markSent();
      setThanks(true);
      requestIdRef.current = "";
      try { storage?.removeItem("mywish.main.request-id"); } catch { /* optional */ }
      goal("form_success", { form_id: FORM_ID, source_bucket: sourceBucketFromAttribution(attribution) });
      requestAnimationFrame(() => {
        const form = formRef.current;
        if (!form) return;
        const r = form.getBoundingClientRect();
        if (r.top < 64 || r.bottom > window.innerHeight) form.scrollIntoView({ behavior: "smooth", block: "center" });
        thanksRef.current?.focus({ preventScroll: true });
      });
    } catch (error) {
      setSubmitError(error instanceof Error && error.message.startsWith("Проверь")
        ? error.message : "Не удалось отправить. Повтори попытку или позвони нам.");
    } finally {
      clearTimeout(timeout);
      sendingRef.current = false;
      setSubmitting(false);
    }
  }

  // цвет обводки живёт в CSS (.u-field): инлайновый стиль перебил бы :focus
  const field = {
    marginTop: px(8),
    height: px(42),
    paddingInline: px(14),
    fontSize: px(14.1),
  };

  const label = { fontSize: "max(12px, 0.725rem)", lineHeight: px(18) };

  const выбранная = order.date
    ? (() => {
        const [y, m, d] = order.date.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : null;
  /* Та же сумма, что в калькуляторе: считает её общий расчёт из pricing.ts. */
  const total = totalOf(order.pkg, order.hours, выбранная);

  /*
    Чего не хватает — по тем же правилам, по которым заявка не уходит:
    имя, телефон из десяти цифр и отметка согласия. Перечисляем в том же
    порядке, в каком расставлен фокус при отказе, иначе подсказка отправит
    человека не туда, куда прыгнет курсор.
  */
  /* В подсказке дата без года: год виден в сводке над кнопкой. */
  const короткаяДата = выбранная
    ? выбранная.getDate() + " " + MONTHS_OF[выбранная.getMonth()]
    : null;

  const нехватка = [
    nameReady ? null : "имени",
    phoneReady ? null : "телефона",
    consent ? null : "отметки согласия",
  ].filter(Boolean) as string[];

  const перечисли = (список: string[]) =>
    список.length < 2
      ? список[0]
      : список.slice(0, -1).join(", ") + " и " + список[список.length - 1];

  let hint =
    "Мы проверим дату, согласуем вместе детали и забронируем зал за тобой.";
  if (aiming) {
    /*
      «В заявке», а не «отправим»: подсказка показывает содержимое заявки,
      а отправляет её человек — обещание сделать это вместе здесь лишнее.

      Перечисляем только выбранное. Заглушки вроде «зал подберём» стояли в
      одном ряду с настоящими пунктами и читались как ещё один выбор, хотя
      выбора там не было. Что осталось несделанным — отдельной фразой в конце.
    */
    const выбрано = [
      order.hall,
      короткаяДата,
      "пакет " + getPackage(order.pkg).title,
      order.hours + " ч",
    ].filter(Boolean) as string[];

    const подберём = [order.hall ? null : "зал", выбранная ? null : "дату"].filter(
      Boolean,
    ) as string[];

    hint = нехватка.length
      ? "Не хватает " + перечисли(нехватка)
      : "В заявке: " +
        выбрано.join(" · ") +
        (выбранная ? " — " + money(total) : "") +
        (подберём.length
          ? ". " +
            перечисли(подберём).replace(/^./, (c) => c.toUpperCase()) +
            " подберём вместе"
          : "");
  }

  return (
    <section
      id="contact"
      data-section="contact"
      data-step="sent"
      className="u-snap"
      /* Коробка подрезана до содержимого — см. Packages.tsx. */
      style={box(0, 5883, 1440, 860)}
    >
      <SectionHeading
        node="914:1862"
        at={[419, 26, 600, 140]}
        accent="своего праздника"
      >
        Заполни детали
      </SectionHeading>

      {/* Стикер над заголовком — image 87 (914:1863) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/form/heading-sticker.webp"
        alt=""
        aria-hidden
        className="u-step-sticker max-w-none"
        style={{ ...box(430, 4, 44, 41), transform: "rotate(-12.2deg)" }}
      />

      {/* Галочка выполненного шага — на месте стикера, см. StepDone. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/steps/done.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="u-step-check max-w-none"
        style={{ ...box(430, 4, 44, 41), transform: "rotate(-12.2deg)" }}
      />
      <StepDone step="sent" at={[430, 4, 44, 41]} />

      {/*
        Подсказка под заголовком — как у залов, пакетов и даты. Здесь под
        курсором она отвечает на вопрос, который человек задаёт перед самым
        нажатием: всё ли готово. Если чего-то не хватает — говорим чего, не
        дожидаясь отказа; если готово — показываем, что именно уйдёт.
      */}
      <p
        className="u-lede u-step-hint"
        data-node-id="914:1801"
        data-active={aiming}
        style={box(220, 191, 1000, 28)}
      >
        {hint}
      </p>

      <form
        ref={formRef}
        data-node-id="914:1802"
        data-extras={extras}
        className="rf-form rounded-md bg-surface ym-hide-content ym-disable-keys"
        aria-busy={submitting}
        style={{
          /*
            Высота 646 вместо 670: поле пожеланий стало на 24 ниже, и всё, что
            под ним, поднялось. Нижнее поле формы осталось прежним — 33, как
            сверху.
          */
          ...box(230, 224, 980, 628),
          boxShadow: "var(--shadow-card-lg)",
        }}
        method="post"
        onSubmit={onSubmit}
        noValidate
      >
        <div className="rf-fields" inert={thanks || submitting} aria-hidden={thanks}>
        <input ref={websiteRef} name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1 }} />
        <noscript><p className="rf-nojs">Для заполнения формы включи JavaScript или <a href={CONTACTS.phone.href}>позвони нам</a>.</p></noscript>
        {/* Зал 914:1803 — девять залов из секции «Выбери зал» */}
        <div className="rf-hall" style={box(33, 33, 914, 69)}>
          <label
            htmlFor="hall"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Зал
          </label>
          <span className="relative block text-ink-muted">
            <select
              id="hall"
              name="hall"
              value={order.hall}
              onChange={(e) => pickHall(e.target.value)}
              className="ym-disable-keys u-field block w-full appearance-none rounded-sm bg-surface-alt font-sans text-ink"
              style={{ ...field, paddingRight: px(34) }}
            >
              {/*
                Коротко: на телефоне поле стоит в половину ширины рядом с
                гостями, и «Помогите выбрать» обрезалось до «Помогите выб».
              */}
              <option value="">Подберём</option>
              {HALLS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {CHEVRON}
          </span>
        </div>

        {/* Имя 914:1812 — обязательное */}
        <div className="rf-name" style={box(33, 118, 448, 68)}>
          <label
            htmlFor="name"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Как тебя зовут
          </label>
          <input
            ref={nameRef}
            id="name"
            name="name"
            autoComplete="name"
            maxLength={80}
            aria-describedby={missing.name ? "name-error" : undefined}
            required
            aria-invalid={missing.name}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (missing.name && e.target.value.trim()) setMissing((m) => ({ ...m, name: false }));
            }}
            placeholder="Имя"
            className="ym-disable-keys u-field block w-full rounded-sm bg-surface-alt font-sans text-ink placeholder:text-ink-muted"
            style={field}
          />
          {missing.name && <p id="name-error" className="rf-field-error">Введи имя</p>}
        </div>

        {/* Количество гостей */}
        <div className="rf-guests" style={box(498, 118, 448, 68)}>
          <label
            htmlFor="guests"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Сколько гостей
          </label>
          <span className="relative block text-ink-muted">
            <select
              id="guests"
              name="guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="ym-disable-keys u-field block w-full appearance-none rounded-sm bg-surface-alt font-sans text-ink"
              style={{ ...field, paddingRight: px(34) }}
            >
              <option value="">Примерно</option>
              {GUESTS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {CHEVRON}
          </span>
        </div>

        {/* Телефон 914:1828 — обязательное, строго по маске */}
        <div className="rf-phone" style={box(33, 203, 448, 90)}>
          <label
            htmlFor="phone"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Телефон
          </label>
          <input
            ref={phoneRef}
            id="phone"
            name="phone"
            autoComplete="tel"
            maxLength={40}
            aria-describedby={missing.phone ? "phone-help" : undefined}
            type="tel"
            inputMode="tel"
            required
            aria-invalid={missing.phone}
            value={phone}
            onChange={(e) => {
              /* Маска «+7 (916) 123-45-67» собирается по мере набора — contact-input.ts. */
              const next = formatPhone(e.target.value, phone);
              setPhone(next);
              if (missing.phone && normalizePhone(next)) setMissing((m) => ({ ...m, phone: false }));
            }}
            placeholder="+7 (___) ___-__-__"
            className="ym-disable-keys u-field block w-full rounded-sm bg-surface-alt font-sans text-ink placeholder:text-ink-muted"
            style={field}
          />
          {/*
            Под полем — только причина отказа. Постоянной подсказки нет: маска
            и так показывает, как набирать, а лишняя строка отвлекала.
          */}
          {missing.phone ? (
            <p
              id="phone-help"
              className="rf-help-error font-sans"
              style={{ marginTop: px(7), fontSize: px(10.8) }}
            >
              Номер неполный: нужно 10 цифр после +7
            </p>
          ) : null}
        </div>

        {/*
          Телефон: пожелание необязательно и свёрнуто за кнопкой — форма короче.
          Мессенджер не сворачиваем: это второй способ связи, его должно быть
          видно, — он стоит под телефоном с пометкой «необязательно».
          На десктопе кнопки нет, поля стоят как в макете (mobile.css).
        */}
        <button
          type="button"
          className="rf-more"
          aria-expanded={extras}
          onClick={() => {
            setExtras(true);
            window.setTimeout(() => document.getElementById("wish")?.focus(), 60);
          }}
        >
          + Вопрос или пожелание
        </button>

        {/* Мессенджер 914:1836 */}
        <div className="rf-messenger" style={box(498, 203, 448, 90)}>
          <label
            htmlFor="messenger"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Мессенджер
          </label>
          <input
            id="messenger"
            name="messenger"
            value={messenger}
            onChange={(e) => {
              /* Собачка ставится сама, ссылка остаётся ссылкой — contact-input.ts. */
              const next = formatMessenger(e.target.value);
              setMessenger(next);
              if (normalizeMessenger(next) !== null) setMissing((m) => ({ ...m, messenger: false }));
            }}
            maxLength={200}
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={missing.messenger}
            aria-describedby={missing.messenger ? "messenger-help" : undefined}
            placeholder="@username Telegram или Max"
            className="ym-disable-keys u-field block w-full rounded-sm bg-surface-alt font-sans text-ink placeholder:text-ink-muted"
            style={field}
          />
          {/* Как и у телефона — только причина отказа; как заполнять, говорит placeholder. */}
          {missing.messenger ? (
            <p
              id="messenger-help"
              className="rf-help-error font-sans"
              style={{ marginTop: px(7), fontSize: px(10.8) }}
            >
              Введи @ник латиницей или ссылку t.me / max.ru
            </p>
          ) : null}
        </div>

        {/* Пожелание 914:1842 */}
        <div className="rf-wish" style={box(33, 309, 914, 90)}>
          <label
            htmlFor="wish"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Вопрос или пожелание
          </label>
          <textarea
            id="wish"
            name="wish"
            maxLength={1000}
            rows={3}
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            placeholder="Например: хочу тотал блэк вечеринку"
            className="ym-disable-keys u-field block w-full resize-none rounded-sm bg-surface-alt font-sans text-ink placeholder:text-ink-muted"
            style={{
              marginTop: px(8),
              /*
                72, а не 91: при 91 поле заканчивалось на 426 и заходило на
                сводку (422) — на десктопе они срастались. На телефоне высоту
                задаёт mobile.css.
              */
              height: px(72),
              padding: `${px(12)} ${px(14)}`,
              fontSize: px(14.1),
            }}
          />
        </div>

        {/* Сводка выбранного 914:1848 — то же, что в калькуляторе выше */}
        <div
          className="rf-summary flex items-center rounded-sm bg-surface-alt"
          style={{ ...box(33, 422, 914, 48), paddingInline: px(18) }}
        >
          {/*
            Три подписанные колонки вместо строки через точку: подпись сверху,
            значение под ней — взгляд сразу находит дату, пакет и время.
          */}
          <dl className="rf-summary-list font-sans">
            <div>
              <dt>Дата</dt>
              <dd>{короткаяДата ?? "не выбрана"}</dd>
            </div>
            <div>
              <dt>Пакет</dt>
              <dd>{getPackage(order.pkg).short}</dd>
            </div>
            <div>
              <dt>Время</dt>
              <dd>{order.hours} ч</dd>
            </div>
          </dl>
          {/*
            Сумма из калькулятора. Человек считал её наверху, а отправляет
            заявку здесь: без неё приходится верить памяти или возвращаться
            к расчёту. Пока дата не выбрана, аренду считать не из чего —
            говорим об этом прямо, а не показываем цену одного пакета как
            итог.
          */}
          <p
            data-empty={!выбранная}
            className="u-form-total ml-auto font-sans font-bold text-ink"
            style={{ fontSize: px(13.3), marginRight: px(18) }}
          >
            {выбранная ? (
              <>
                <span className="rf-total-label">Предварительно</span>{" "}
                <span className="text-primary">{money(total)}</span>
              </>
            ) : (
              "Выбери дату — посчитаем"
            )}
          </p>
          <a
            href="#price"
            className="font-sans text-primary underline-offset-2 hover:underline"
            style={{ fontSize: px(11.6) }}
          >
            Изменить
          </a>
        </div>

        {/*
          Согласие 914:1853 — обязательное, без него заявка не уходит.

          В макете здесь одна строка «Даю согласие на обработку персональных
          данных». Строка расшифровки добавлена: отметка должна быть
          информированной, то есть человеку до отметки видно, на что он
          соглашается и где прочитать условия. Формулировки и разбивка на две
          строки взяты с черновой версии сайта, тексты открываются тут же в
          модалке — теми же документами, что и в подвале.

          Блок поднят с 507 на 500 и занял 37 вместо 27: вторая строка влезла
          в зазор до кнопки, поэтому кнопка и подпись под ней остались на
          макетных местах.
        */}
        <div
          ref={consentRef}
          className="rf-consent flex items-center"
          style={box(33, 476, 914, 37)}
        >
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            checked={consent}
            aria-invalid={missing.consent}
            aria-describedby="consent-note"
            onChange={(e) => {
              setConsent(e.target.checked);
              /* Момент отметки уходит вместе с заявкой — так обещает документ. */
              consentAtRef.current = e.target.checked
                ? new Date().toISOString()
                : null;
              if (e.target.checked)
                setMissing((m) => ({ ...m, consent: false }));
            }}
            /*
              18 вместо макетных 11. Отметка обязательная — без неё заявка не
              уходит, — а попасть в квадратик 11×11 мышью тяжело, пальцем почти
              нельзя. Подпись рядом кликабельна через label, но полагаться
              только на неё нельзя: глазом человек целится в сам квадрат.
            */
            /* Круглая отметка по центру текста — вид в globals.css (.u-consent-box). */
            className="u-consent-box shrink-0"
            style={{ width: px(20), height: px(20) }}
          />
          <span style={{ marginLeft: px(10) }}>
            <label
              htmlFor="consent"
              className={`block font-sans font-semibold ${
                missing.consent ? "text-primary" : "text-ink"
              }`}
              style={{ fontSize: px(11.6), lineHeight: px(18) }}
            >
              {/*
                Текст отметки — обычный, без ссылки внутри. Ссылка — это кнопка,
                а кнопка переносится только целиком: «согласие на обработку
                персональных данных» уезжало на вторую строку, и «Даю» стояло
                одно. Документы — отдельной строкой ниже.
              */}
              Даю согласие на обработку персональных данных
            </label>
            <p
              id="consent-note"
              className="font-sans text-ink-muted"
              style={{
                marginTop: px(3),
                fontSize: px(10.4),
                lineHeight: px(16),
              }}
            >
              Документы:{" "}
              <button
                type="button"
                onClick={() => setLegal("consent")}
                className="u-legal-link"
              >
                согласие
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => setLegal("privacy")}
                className="u-legal-link"
              >
                политика конфиденциальности
              </button>
            </p>
          </span>
        </div>

        {/* Кнопка 914:1857 */}
        <button
          type="submit"
          disabled={!hydrated || thanks || submitting}
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") setAiming(true);
          }}
          onPointerLeave={() => setAiming(false)}
          /*
            Только фокус с клавиатуры. На телефоне касание тоже даёт кнопке
            фокус: подсказка над формой менялась на длинную, форма съезжала
            вниз, и палец отпускался уже мимо кнопки — заявка уходила со
            второго нажатия.
          */
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) setAiming(true);
          }}
          onBlur={() => setAiming(false)}
          className="rf-submit u-cta font-extrabold hover:-translate-y-2 hover:bg-navy hover:text-surface"
          style={{ ...box(33, 523, 914, 60), fontSize: px(18.3) }}
        >
          {submitting ? "ОТПРАВЛЯЕМ…" : "ОТПРАВИТЬ ЗАЯВКУ"}
        </button>

        {/*
          Подпись под кнопкой объясняет отказ. Имя с телефоном идут первыми:
          на них наводится фокус, и подсказка должна говорить про то поле, куда
          человека только что отправили.
        */}
        <p
          className={`rf-status text-center font-sans ${
            missing.name || missing.phone || missing.consent
              ? "text-primary"
              : "text-ink-muted"
          }`}
          role="status"
          style={{ ...box(33, 597, 914, 16), fontSize: px(11.6) }}
        >
          {submitError || (missing.name
            ? "Введи имя"
            : missing.phone ? "Проверь номер телефона"
            : missing.messenger ? "Проверь адрес мессенджера"
            : missing.consent
              ? "Поставь отметку согласия — без неё мы не вправе принять заявку"
              : /* Без ошибки строки нет. */ "")}
        </p>

        <button
          type="button"
          className="rf-reset"
          onClick={() => {
            resetDraft();
            requestIdRef.current = "";
            try { sessionStorage.removeItem("mywish.main.request-id"); } catch { /* optional */ }
            setSubmitError("");
            setConsent(false);
            consentAtRef.current = null;
            setExtras(false);
            setMissing({ name: false, phone: false, messenger: false, consent: false });
          }}
        >
          Очистить выбор и поля
        </button>

        </div>
        <div
          className="rf-success"
          data-shown={thanks}
          aria-hidden={!thanks}
          inert={!thanks}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/steps/done.webp" alt="" aria-hidden className="rf-success-mark" />
          <h3 ref={thanksRef} tabIndex={-1} className="rf-success-title">
            Заявка отправлена
          </h3>
          <p className="rf-success-text">
            Личный менеджер свяжется с тобой{phoneReady ? ` по номеру ${phone}` : ""}
            , проверит дату и поможет с деталями.
          </p>
          <button
            type="button"
            className="rf-success-edit"
            onClick={() => {
              setThanks(false);
              setConsent(false);
              consentAtRef.current = null;
              setOrder({ sent: false });
              nameRef.current?.focus({ preventScroll: true });
            }}
          >
            Изменить данные
          </button>
        </div>
      </form>

      <LegalModal id={legal} onClose={() => setLegal(null)} />
    </section>
  );
}
