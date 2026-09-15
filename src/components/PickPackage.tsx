"use client";

import { scrollToSection } from "@/lib/navigation";

import { pickPackage, useOrder } from "@/lib/order";
import { getPackage, type PackageId } from "@/lib/pricing";

/**
 * Кнопка «выбрать» в карточке пакета. Запоминает выбор и уводит к календарю:
 * там этот пакет уже подставлен в расчёт, остаётся выбрать дату и часы.
 *
 * После выбора надпись меняется на «ВЫБРАН» с галочкой. Обводка вокруг
 * карточки говорит то же самое, но она общая для карточки, а подпись стоит
 * ровно там, куда человек только что нажал, — и остаётся ответом на действие.
 */
/** Сколько держим страницу на месте, чтобы отметка шага была видна. */
const HOLD = 420;

export default function PickPackage({
  id,
  style,
}: {
  id: PackageId;
  style: React.CSSProperties;
}) {
  const order = useOrder();
  const picked = order.pkgTouched && order.pkg === id;

  return (
    <a
      href="#price"
      className="u-chip"
      data-picked={picked}
      aria-label={picked ? `Отменить выбор пакета ${getPackage(id).short}` : `Выбрать пакет ${getPackage(id).short}`}
      style={style}
      onClick={(event) => {
        /*
          Повторное нажатие снимает выбор — и тогда уводить к расчёту незачем:
          человек только что отказался от пакета, а не перешёл к следующему
          шагу. Поэтому переход по ссылке отменяем.
        */
        if (picked) {
          event.preventDefault();
          pickPackage(id);
          return;
        }

        /*
          Переход придерживаем на время отметки. Без паузы страница уезжает к
          расчёту в тот же кадр, и галочку с искрами над заголовком человек не
          видит — отмечать шаг становится не для кого.
        */
        event.preventDefault();
        pickPackage(id);
        window.setTimeout(() => {
          scrollToSection("price");
        }, HOLD);
      }}
    >
      {picked ? (
        <>
          <svg viewBox="0 0 16 16" aria-hidden fill="none" className="u-chip-check">
            <path
              d="m3.5 8.4 3 3 6-6.4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          ВЫБРАН
        </>
      ) : (
        "ВЫБРАТЬ"
      )}
    </a>
  );
}
