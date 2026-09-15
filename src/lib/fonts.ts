import localFont from "next/font/local";

/**
 * Шрифты макета. Файлы лежат в корне проекта (пришли вместе с макетом),
 * next/font/local требует литеральных путей — без шаблонных строк.
 */

/** Заголовки: Fira Sans Extra Condensed. */
export const fira = localFont({
  src: [
    { path: "../fonts/FiraSansExtraCondensed-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/FiraSansExtraCondensed-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/FiraSansExtraCondensed-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/FiraSansExtraCondensed-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "../fonts/FiraSansExtraCondensed-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-fira",
  display: "swap",
  fallback: ["Fira Sans Condensed", "Arial Narrow", "system-ui", "sans-serif"],
});

/** Текст: Manrope (вариативный, 200–800 покрывает Regular/Medium/SemiBold/Bold/ExtraBold). */
export const manrope = localFont({
  src: [{ path: "../fonts/Manrope-VariableFont_wght.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-manrope",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
});

/** Подпись «by Rubin Loft» в логотипе. В папке проекта не было — забран с Google Fonts (OFL). */
export const pinyon = localFont({
  src: [{ path: "../fonts/PinyonScript-Regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-pinyon",
  display: "swap",
  fallback: ["Segoe Script", "cursive"],
});
