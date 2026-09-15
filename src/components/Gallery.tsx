import SectionHeading from "./SectionHeading";
import GalleryMobile from "./GalleryMobile";
import { box } from "@/lib/px";
import { PHOTOS } from "@/lib/gallery";

/**
 * Секция 3 «как выглядит праздник» — Figma 914:1184 … 914:1181.
 * Сцена: макет 1976…3101 → 1020 на странице.
 * Сетка: колонки 130 / 330 / 730 / 1130, зазор 20, ряды на 166 / 452 / 871.
 *
 * Плитки выгружены из Figma отрендеренными нодами (масштаб 2×): кроп и радиус
 * запечены в файл, поэтому кадрирование совпадает с макетом до пикселя.
 *
 * Каждая плитка обёрнута в рамку .u-photo: на наведении увеличивается кадр
 * внутри, а не сама плитка, — сетка от этого не шевелится.
 *
 * Список снимков — src/lib/gallery.ts, общий с телефонной сеткой: ниже 1024
 * плитки по координатам прячутся, вместо них GalleryMobile (сетка 2/1/2,
 * снимки сменяют друг друга сами).
 */

export default function Gallery() {
  return (
    <section id="gallery" data-section="gallery" style={box(0, 1020, 1440, 1125)}>
      <SectionHeading size="l" node="914:1184" at={[544, 0, 352, 100]} accent=" праздник">
        Как выглядит
      </SectionHeading>

      {PHOTOS.map((p) => (
        <figure key={p.node} className="u-photo" style={box(...p.at)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/figma/gallery/n${p.node}.webp`}
            alt={p.alt}
            data-node-id={`914:${p.node}`}
            loading="lazy"
            decoding="async"
            className="max-w-none"
          />
        </figure>
      ))}

      <GalleryMobile />
    </section>
  );
}
