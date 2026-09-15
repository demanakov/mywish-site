"use client";

import { scrollToSection } from "@/lib/navigation";

import { useEffect } from "react";
import { isPackagePicked, pickPackage, useOrder } from "@/lib/order";
import type { PackageId } from "@/lib/pricing";

/**
 * Отмечает на секции пакетов, какой из них выбран.
 *
 * Карточки собраны на сервере — три статичных блока по координатам макета.
 * Делать их клиентскими ради одного признака дорого и незачем: состояние
 * общее для всех трёх (выбран один — двое других тускнеют), поэтому оно и
 * живёт на общем предке, а раскрашивает карточки CSS.
 *
 * Пишем только после явного выбора: до первого нажатия в черновике заказа
 * лежит рекомендованный пакет, и подсвечивать его как выбранный нельзя —
 * человек его не выбирал.
 */
export default function PackagesChoice() {
  const order = useOrder();
  const picked = order.pkgTouched ? order.pkg : "";

  useEffect(() => {
    const section = document.getElementById("packages");
    if (!section) return;
    section.dataset.picked = picked;
    return () => {
      delete section.dataset.picked;
    };
  }, [picked]);

  /*
    Выбрать можно нажатием по всей карточке, а не только по кнопке «Выбрать».
    Карточка большая, курсор над ней и так превращается в палец, и промахнуться
    мимо кнопки проще, чем попасть.

    Слушаем секцию, а не каждую карточку: карточки серверные, вешать на них
    обработчики означало бы сделать клиентскими все три. Нажатия по ссылкам и
    кнопкам внутри пропускаем — там свои действия: переход к разделу и меню.
  */
  useEffect(() => {
    const section = document.getElementById("packages");
    if (!section) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest("a, button")) return;
      const card = target.closest<HTMLElement>(".u-package-card");
      const id = card?.dataset.package as PackageId | undefined;
      if (!id) return;
      const снимаем = isPackagePicked(id);
      pickPackage(id);
      /*
        Тот же переход, что у кнопки, — не когда выбор снимают и с той же
        паузой: за неё успевает отыграть отметка шага над заголовком.
      */
      if (!снимаем) {
        window.setTimeout(() => {
          scrollToSection("price");
        }, 420);
      }
    };

    section.addEventListener("click", onClick);
    return () => section.removeEventListener("click", onClick);
  }, []);

  return null;
}
