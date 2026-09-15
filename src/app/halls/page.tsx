import "../halls.css";
import { pageMetadata } from "@/lib/site";
import type { Metadata } from "next";
import FloatingHeader from "@/components/FloatingHeader";
import ScrollReveal from "@/components/ScrollReveal";
import HallsHero from "@/components/halls/HallsHero";
import HallsCatalog from "@/components/halls/HallsCatalog";
import HallsFooter from "@/components/halls/HallsFooter";
import { HALL_TITLES } from "@/lib/halls.mjs";

/**
 * Страница залов — продолжение главной, а не отдельный сайт.
 *
 * Попадают сюда тремя дорогами: кнопка «Все залы» во втором блоке главной,
 * кнопка «Залы» у каждого адреса в секции «где проходит» (там ссылка ведёт
 * сразу на нужную площадку) и колонка «Залы» в подвале — оттуда прямо на
 * конкретный зал по якорю.
 *
 * Шапка, подвал, шрифты, цвета и отклики общие с главной. Отличается только
 * раскладка: здесь она потоковая, а не по координатам макета, — фотографий у
 * залов разное число, и абсолютные координаты пришлось бы пересчитывать после
 * каждой замены снимка.
 */

export const metadata: Metadata = {
  ...pageMetadata("Залы MyWish", "/halls"),
  title: "Залы MyWish — девять залов на трёх площадках в Санкт-Петербурге",
  description: `Все залы MyWish by Rubin Loft: ${HALL_TITLES.join(", ")}. Фотографии каждого зала, адреса площадок и карточки на Яндекс.Картах.`,
};

export default function HallsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="halls-page">
      <FloatingHeader />
      <ScrollReveal />
      <HallsHero />

      <div className="halls-body">
        <div className="stage halls-body-inner">
          <HallsCatalog />
        </div>
      </div>

      <HallsFooter />
    </main>
  );
}
