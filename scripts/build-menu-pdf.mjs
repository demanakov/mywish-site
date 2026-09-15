/**
 * Собирает полное меню в один PDF для кнопки «Скачать меню» (FoodMenuModal).
 *
 *   node scripts/build-menu-pdf.mjs
 *
 * Исходные PDF из макета («пакеты модалка/меню», 7 файлов) весят 18 МБ —
 * для скачивания с телефона слишком тяжело. Здесь PDF собирается из тех же
 * страниц, что показывает окно (public/packages/food/menu/page-0N.webp):
 * каждая страница — JPEG 1654px по ширине (≈200 dpi на A4), текст меню
 * читается и при увеличении. Итог — public/packages/food/menu/mywish-menu.pdf.
 *
 * PDF пишется вручную: картинки JPEG встраиваются в PDF как есть (DCTDecode),
 * отдельная библиотека для этого не нужна.
 */

import sharp from "sharp";
import { writeFileSync } from "node:fs";

const PAGES = 7;
const WIDTH = 1654;
const PAGE_W = 595.28;
const SRC = (n) => `public/packages/food/menu/page-${String(n).padStart(2, "0")}.webp`;
const OUT = "public/packages/food/menu/mywish-menu.pdf";

const chunks = [];
const offsets = [];
let offset = 0;
const push = (part) => {
  const buf = typeof part === "string" ? Buffer.from(part, "latin1") : part;
  chunks.push(buf);
  offset += buf.length;
};
const object = (n, ...parts) => {
  offsets[n] = offset;
  push(`${n} 0 obj\n`);
  parts.forEach(push);
  push("\nendobj\n");
};

/* Строка PDF в UTF-16BE — для русского названия документа. */
const text = (s) => `<FEFF${Buffer.from(s, "utf16le").swap16().toString("hex").toUpperCase()}>`;

push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

const pageObj = (i) => 4 + i * 3;
object(1, "<< /Type /Catalog /Pages 2 0 R >>");
object(
  2,
  `<< /Type /Pages /Kids [${Array.from({ length: PAGES }, (_, i) => `${pageObj(i)} 0 R`).join(" ")}] /Count ${PAGES} >>`,
);
object(3, `<< /Title ${text("MyWish — меню")} /Producer (MyWish) >>`);

let total = 0;
for (let i = 0; i < PAGES; i++) {
  const { data: jpeg, info } = await sharp(SRC(i))
    .resize({ width: WIDTH })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  total += jpeg.length;
  const pageH = +((PAGE_W * info.height) / info.width).toFixed(2);
  const [page, content, image] = [pageObj(i), pageObj(i) + 1, pageObj(i) + 2];
  const draw = `q ${PAGE_W} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;

  object(
    page,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${pageH}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`,
  );
  object(content, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  object(
    image,
    `<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    jpeg,
    "\nendstream",
  );
}

const size = 4 + PAGES * 3;
const xref = offset;
push(`xref\n0 ${size}\n0000000000 65535 f \n`);
for (let n = 1; n < size; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
push(`trailer\n<< /Size ${size} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

const pdf = Buffer.concat(chunks);
writeFileSync(OUT, pdf);
console.log(`${OUT}: ${PAGES} стр., ${(pdf.length / 1024 / 1024).toFixed(2)} МБ (картинки ${(total / 1024 / 1024).toFixed(2)} МБ)`);
