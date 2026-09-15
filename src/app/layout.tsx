import { pageMetadata } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { fira, manrope, pinyon } from "@/lib/fonts";
import "./globals.css";
/* Мобильная раскладка — после основного файла, чтобы перекрывать его правила. */
import "./mobile.css";
import "./polish.css";

export const metadata: Metadata = {
  ...pageMetadata("MyWish — женские праздники в Санкт-Петербурге", "/"),
  title: "MyWish — женские праздники в Санкт-Петербурге",
  description:
    "Твой вишлист уже собран в праздник. Залы, пакеты, личный менеджер и Reels после праздника — MyWish by Rubin Loft, Санкт-Петербург.",
};

export const viewport: Viewport = {
  themeColor: "#fff9f7",
  width: "device-width",
  initialScale: 1,
  /*
    Страница — до краёв экрана: на iPhone первый кадр и прокручиваемые блоки
    заходят под строку состояния, а не упираются в пустую полосу над ней.
    Шапки и меню сами отступают на env(safe-area-inset-top) — см. mobile.css.
  */
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      data-scroll-behavior — для Next, а не для CSS: у нас на <html> стоит
      scroll-behavior: smooth ради переходов по якорям внутри страницы, и без
      этого признака Next восстанавливает позицию при смене страницы тем же
      плавным ходом. Между главной и залами это выглядело как проматывание
      всей страницы вместо появления новой.
    */
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      /* Только в разработке: тёмный холст вокруг страницы — см. globals.css. */
      data-dev-frame={process.env.NODE_ENV === "development" ? "" : undefined}
      className={`${fira.variable} ${manrope.variable} ${pinyon.variable}`}
      /* Скрипт ниже снимает data-dev-frame до гидратации — это ожидаемо. */
      suppressHydrationWarning
    >
      <head>
        {/*
          Блоки появляются при прокрутке: до этого их прячет CSS, а показывает
          наблюдатель из ScrollReveal. Без скрипта показывать было бы некому,
          поэтому здесь страховка — при выключенном JS содержимое просто на
          месте, без появления.
        */}
        <noscript>
          <style>{`[data-reveal],.hero-drop,.hero-gate,.hero-panel{opacity:1!important;visibility:visible!important;transform:none!important}.hero-veil{opacity:1!important}`}</style>
        </noscript>
      </head>
      <body>
        <a className="skip-link" href="#main-content">Перейти к содержимому</a>
        {children}
        {/*
          Высота окна браузера в пикселях — переменная --app-vh для модальных
          окон. На iPhone (iOS 26.3) единицы dvh внутри модального <dialog>
          считались нулём: окно меню с едой открывалось высотой 0 — было видно
          только затемнение. innerHeight надёжен; обновляется при повороте и
          смене размера. beforeInteractive — до гидратации, окна ещё не открыты.
        */}
        {/*
          Перезагрузка — всегда с начала страницы.

          Раньше браузер при перезагрузке возвращал прежнюю позицию или уходил
          к якорю из адреса (#price, #faq — их оставляют переходы из меню и после
          выбора пакета). Высота страницы после загрузки меняется: догружаются
          картинки, встают карусели, проявляются блоки, — и восстановленная
          позиция промахивалась: страница открывалась в случайном месте.

          Правило:
            • перезагрузка            — наверх, якорь из адреса убираем;
            • переход по ссылке с #   — к разделу (например, «Выбрать этот зал»
                                        со страницы залов ведёт к пакетам);
            • «Назад» и «Вперёд»      — туда, где человек был, как привыкли.
          На iPhone «наверх» — это исходное положение под часами: его ставит
          lib/heroRunway.ts уже после этого скрипта.

          Страховка на load: если браузер всё же успел увести страницу вниз
          (позицию он восстанавливает по мере загрузки), возвращаем наверх.
        */}
        <Script id="reload-to-top" strategy="beforeInteractive">
          {'(function(){try{var n=performance.getEntriesByType("navigation")[0];if(!n||n.type!=="reload")return;history.scrollRestoration="manual";if(location.hash)history.replaceState(history.state,"",location.pathname+location.search);window.scrollTo(0,0);window.addEventListener("load",function(){if(window.scrollY>120)window.scrollTo(0,0)},{once:true})}catch(e){}})()'}
        </Script>
        <Script id="app-vh" strategy="beforeInteractive">
          {'(function(){var r=document.documentElement;function s(){r.style.setProperty("--app-vh",window.innerHeight+"px")}s();window.addEventListener("resize",s)})()'}
        </Script>
        {/*
          Только в разработке: тёмный холст нужен встроенному браузеру, а на
          настоящем iPhone (сайт открывают по адресу dev-сервера) Safari залил
          бы этим тёмным цветом зону часов. На iPhone и iPad рамку снимаем.
          beforeInteractive — Next вставляет скрипт в исходный HTML до гидратации.
        */}
        {process.env.NODE_ENV === "development" ? (
          <Script id="dev-frame-ios" strategy="beforeInteractive">
            {'if(/iPhone|iPad|iPod/.test(navigator.userAgent))document.documentElement.removeAttribute("data-dev-frame")'}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
