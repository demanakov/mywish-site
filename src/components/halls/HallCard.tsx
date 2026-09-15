"use client";

import { useState } from "react";
import Link from "next/link";
import { pickHall, useOrder } from "@/lib/order";
import { useSwipe } from "@/lib/useSwipe";

/**
 * Карточка зала: обложка, которую можно листать прямо на месте, название и
 * кнопка брони.
 *
 * Листание в карточке — чтобы посмотреть зал, не открывая окно на весь экран.
 * Стрелки появляются под курсором: без наведения они бы спорили с обложкой.
 * Полноэкранный просмотр никуда не делся — он по клику на саму фотографию.
 *
 * Индекс живёт в карточке, а не в общем состоянии: карточки листают
 * независимо друг от друга, и складывать девять счётчиков в одно место незачем.
 *
 * Кадры здесь свои, карточного размера (thumb-NN), а не те, что в окне: при
 * листании каждый следующий догружается, и полноразмерные стоили бы вчетверо
 * дороже по трафику.
 */
export default function HallCard({
  slug,
  title,
  shots,
  location,
  onOpen,
}: {
  slug: string;
  title: string;
  shots: number;
  location: string;
  /** Открыть полноэкранный просмотр с этого кадра. */
  onOpen: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const order = useOrder();
  const picked = order.hall === title;
  /*
    Выбран какой-то зал — значит про остальные решение уже принято. Их кнопки
    гасим: так видно, что действие завершено, и страница перестаёт предлагать
    девять равнозначных вариантов.
  */
  const dim = Boolean(order.hall) && !picked;

  /* По кругу: с последнего кадра вперёд — снова первый. */
  const step = (delta: number) =>
    setIndex((i) => (i + delta + shots) % shots);

  /*
    На телефоне кадры листаются свайпом по фотографии: наведения там нет, и
    стрелки — единственная подсказка, а попасть по ним пальцем труднее, чем
    провести по снимку. Нажатие без сдвига по-прежнему открывает просмотр.
  */
  const swipe = useSwipe(step);

  return (
    <article id={slug} className="halls-card">
      <div className="halls-card-frame" {...swipe}>
        <button
          type="button"
          className="halls-card-open"
          onClick={() => onOpen(index)}
          aria-label={`${title} — открыть фотографии во весь экран`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/halls/${slug}/thumb-${String(index + 1).padStart(2, "0")}.webp`}
            alt={`Зал «${title}», ${location}`}
            loading="lazy"
            decoding="async"
            className="halls-card-img"
          />
        </button>

        {/*
          Стрелки лежат поверх фотографии отдельными кнопками, а не внутри
          той, что открывает окно: вложенных кнопок в разметке не бывает.
        */}
        <button
          type="button"
          className="halls-card-nav halls-card-prev"
          onClick={() => step(-1)}
          aria-label={`${title}: предыдущий кадр`}
        >
          <svg viewBox="0 0 8 12" aria-hidden fill="none">
            <path
              d="M7 1 1.5 6 7 11"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="halls-card-nav halls-card-next"
          onClick={() => step(1)}
          aria-label={`${title}: следующий кадр`}
        >
          <svg viewBox="0 0 8 12" aria-hidden fill="none">
            <path
              d="M1 1 6.5 6 1 11"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/*
          Соседние кадры держим загруженными и вне глаз. Без этого каждый
          щелчок стрелкой упирался в загрузку файла: кадр не менялся сразу, и
          листание казалось срабатывающим через раз.
        */}
        <span aria-hidden className="halls-card-preload">
          {[-1, 1].map((d) => {
            const i = (index + d + shots) % shots;
            const n = String(i + 1).padStart(2, "0");
            // eslint-disable-next-line @next/next/no-img-element
            return <img key={d} src={`/halls/${slug}/thumb-${n}.webp`} alt="" />;
          })}
        </span>

        <span aria-hidden className="halls-card-count">
          {index + 1} / {shots}
        </span>
      </div>

      <div className="halls-card-foot">
        <h3 className="halls-card-title">{title}</h3>
        {/*
          Выбор зала и переход к следующему шагу — к пакету.
          Link, а не обычная ссылка: переход остаётся внутри приложения, и
          черновик заказа не теряется вместе с перезагрузкой. На случай, если
          страницу всё же перезагрузят, pickHall кладёт зал в sessionStorage.
        */}
        <Link
          href="/#packages"
          className="halls-card-book"
          data-picked={picked}
          data-dim={dim}
          onClick={(event) => { if (picked) { event.preventDefault(); pickHall(""); } else pickHall(title); }}
        >
          {picked ? "Отменить выбор" : "Выбрать"}
        </Link>
      </div>
    </article>
  );
}
