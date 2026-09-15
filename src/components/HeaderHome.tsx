"use client";
import Link from "next/link";
import { heroRunway } from "@/lib/heroRunway";

/**
 * Логотип в шапке — возврат на первый экран.
 *
 * Один компонент на обе шапки: статическую (SiteHeader) и плавающую
 * (FloatingHeader). Раньше ссылкой был только знак в статической шапке, то
 * есть нажать на него можно было ровно в одной точке сайта — в самом верху
 * страницы. Стоило прокрутить вниз, и на экране оказывалась плавающая шапка,
 * где тот же знак был обычной картинкой.
 *
 * На главной странице это не переход, а прокрутка наверх: адрес тот же,
 * перезагружать страницу ради возврата к hero незачем — а с недавних пор ещё
 * и накладно, потому что перезагрузка сбрасывает выбранный зал. Со страницы
 * залов ссылка работает как обычная ссылка.
 */
export default function HeaderHome({ floating = false }: { floating?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="MyWish — на первый экран"
      className="site-header-home"
      onClick={(event) => {
        if (window.location.pathname !== "/") return;
        /* Модификаторы — «открыть в новой вкладке»: такой клик не перехватываем. */
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.scrollTo({
          /* На iPhone «верх» — с запасом под часами, как при открытии страницы. */
          top: heroRunway(),
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
        /* Снимаем якорь, иначе «назад» вернёт к тому же разделу. */
        if (window.location.hash) {
          history.replaceState(null, "", window.location.pathname);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/1-hero/logo.webp"
        alt="MyWish by Rubin Loft"
        className={`${
          floating ? "floating-header-logo" : "site-header-logo"
        } size-full max-w-none`}
      />
    </Link>
  );
}
