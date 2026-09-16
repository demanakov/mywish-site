"use client";

import { useEffect, useRef } from "react";

const ACTIVE_QUERY =
  "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const smoothstep = (value: number) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};

/**
 * Click-only camera flight from Hero to Halls. Normal page scrolling never
 * touches this component; the video temporarily becomes a fixed overlay.
 */
export default function HeroToHallsTransition() {
  const layerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const video = videoRef.current;
    const scene = document.getElementById("hero-halls-transition");
    const sticky = scene?.querySelector<HTMLElement>(".hero-halls-sticky");
    const halls = document.getElementById("halls");
    const hallsInterface = halls?.querySelector<HTMLElement>(
      ".halls-interface-layer",
    );
    const hallsHouses = halls?.querySelector<HTMLElement>(
      ".halls-houses-layer",
    );
    const heroInterfaces = scene
      ? Array.from(scene.querySelectorAll<HTMLElement>(".hero-interface-layer"))
      : [];

    if (
      !layer ||
      !video ||
      !scene ||
      !sticky ||
      !halls ||
      !hallsInterface ||
      !hallsHouses
    )
      return;

    const media = window.matchMedia(ACTIVE_QUERY);
    /*
      В разметке preload="none": переход живёт только на десктопе, и телефон
      не должен качать ролик заранее. Где переход есть — буферизуем его сразу,
      чтобы полёт по нажатию начинался без ожидания.
    */

    const trigger = document.querySelector<HTMLElement>(
      "[data-hero-halls-trigger]",
    );
    const warm = () => { if (media.matches && video.preload === "none") { video.preload = "auto"; video.load(); } };
    trigger?.addEventListener("pointerenter", warm);
    trigger?.addEventListener("focus", warm);
    let animationFrame = 0;
    let handoffAnimation: Animation | null = null;
    let playing = false;
    let teleported = false;

    /*
      Где встаёт верх залов после полёта — тот же отступ, что у перехода по
      ссылке #halls (src/app/anchors.css), чтобы оба пути вели в одну точку.
    */
    const safeTop = () =>
      parseFloat(getComputedStyle(halls).scrollMarginTop) ||
      clamp(window.innerHeight * 0.05, 40, 64);

    const destinationScroll = () =>
      Math.max(
        0,
        halls.getBoundingClientRect().top + window.scrollY - safeTop(),
      );

    const resetVisuals = () => {
      layer.dataset.playing = "false";
      layer.style.opacity = "";
      layer.style.filter = "";
      video.style.transform = "";
      sticky.style.zIndex = "";

      for (const heroInterface of heroInterfaces) {
        heroInterface.style.opacity = "";
        heroInterface.style.transform = "";
        heroInterface.style.filter = "";
        heroInterface.style.pointerEvents = "";
      }

      hallsInterface.style.opacity = "";
      hallsInterface.style.transform = "";
      hallsInterface.style.filter = "";
      hallsInterface.style.pointerEvents = "";
      hallsInterface.style.zIndex = "";
      hallsHouses.style.opacity = "";
      hallsHouses.style.pointerEvents = "";
      trigger?.removeAttribute("aria-busy");
    };

    const complete = () => {
      if (!playing) return;
      if (!teleported) window.scrollTo({ top: destinationScroll() });
      playing = false;
      teleported = false;
      const finishedHandoff = handoffAnimation;
      handoffAnimation = null;
      finishedHandoff?.cancel();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      resetVisuals();
      video.pause();
      video.currentTime = 0;
    };

    const beginHandoff = () => {
      if (!playing) return;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;

      if (!teleported) {
        teleported = true;
        window.scrollTo({ top: destinationScroll(), behavior: "instant" });
      }

      // Freeze both sides on the same geometry before blending them. Keeping
      // the first 70ms fully opaque prevents the video ending from reading as
      // a cut; the subtle blur masks compression differences during the mix.
      video.style.transform = `translate3d(0, ${safeTop()}px, 0)`;
      hallsInterface.style.opacity = "1";
      hallsInterface.style.transform = "translate3d(0, 0, 0) scale(1)";
      hallsInterface.style.filter = "blur(0px)";
      hallsInterface.style.pointerEvents = "auto";
      hallsHouses.style.opacity = "1";
      hallsHouses.style.pointerEvents = "auto";
      layer.style.opacity = "1";
      layer.style.filter = "blur(0px)";
      sticky.style.zIndex = "20";

      handoffAnimation = layer.animate(
        [
          { opacity: 1, filter: "blur(0px)", offset: 0 },
          { opacity: 1, filter: "blur(0px)", offset: 0.2 },
          { opacity: 0.5, filter: "blur(0.6px)", offset: 0.68 },
          { opacity: 0, filter: "blur(0px)", offset: 1 },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          fill: "forwards",
        },
      );
      handoffAnimation.onfinish = complete;
    };

    const cancel = () => {
      if (!playing) return;
      playing = false;
      teleported = false;
      if (handoffAnimation) {
        handoffAnimation.onfinish = null;
        handoffAnimation.cancel();
        handoffAnimation = null;
      }
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      video.pause();
      resetVisuals();
      video.currentTime = 0;
    };

    const render = () => {
      if (!playing) return;

      const duration = Number.isFinite(video.duration) ? video.duration : 1.8;
      const progress = clamp(video.currentTime / Math.max(duration, 0.001));

      const heroDeparture = smoothstep((progress - 0.08) / 0.24);
      for (const heroInterface of heroInterfaces) {
        heroInterface.style.opacity = String(1 - heroDeparture);
        heroInterface.style.transform = `translate3d(0, ${lerp(
          0,
          -18,
          heroDeparture,
        )}px, 0) scale(${lerp(1, 0.86, heroDeparture)})`;
        heroInterface.style.filter = `blur(${lerp(0, 2, heroDeparture)}px)`;
        heroInterface.style.pointerEvents = "none";
      }

      const settle = smoothstep((progress - 0.9) / 0.1);
      video.style.transform = `translate3d(0, ${safeTop() * settle}px, 0)`;

      if (!teleported && progress >= 0.8) {
        teleported = true;
        window.scrollTo({ top: destinationScroll(), behavior: "instant" });
      }

      const hallsArrival = smoothstep((progress - 0.8) / 0.16);
      hallsInterface.style.zIndex = "30";
      hallsInterface.style.opacity = String(hallsArrival);
      hallsInterface.style.transform = `translate3d(0, ${lerp(
        18,
        0,
        hallsArrival,
      )}px, 0) scale(${lerp(1.04, 1, hallsArrival)})`;
      hallsInterface.style.filter = `blur(${lerp(1.5, 0, hallsArrival)}px)`;
      hallsInterface.style.pointerEvents = progress >= 0.94 ? "auto" : "none";

      animationFrame = window.requestAnimationFrame(render);
    };

    const playToHalls = (event: Event) => {
      event.preventDefault();
      if (playing) return;

      if (!media.matches) {
        halls.scrollIntoView({ behavior: "smooth" });
        return;
      }

      playing = true;
      teleported = false;
      trigger?.setAttribute("aria-busy", "true");
      layer.dataset.playing = "true";
      layer.style.opacity = "1";
      layer.style.filter = "blur(0px)";
      sticky.style.zIndex = "20";

      hallsInterface.style.zIndex = "30";
      hallsInterface.style.opacity = "0";
      hallsInterface.style.pointerEvents = "none";
      hallsHouses.style.opacity = "0";
      hallsHouses.style.pointerEvents = "none";
      video.currentTime = 0;

      const playback = video.play();
      playback.then(
        () => {
          if (playing) animationFrame = window.requestAnimationFrame(render);
        },
        () => {
          window.scrollTo({ top: destinationScroll(), behavior: "smooth" });
          cancel();
        },
      );
    };

    video.addEventListener("ended", beginHandoff);
    trigger?.addEventListener("click", playToHalls);
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("resize", cancel, { passive: true });

    return () => {
      cancel();
      trigger?.removeEventListener("pointerenter", warm);
      trigger?.removeEventListener("focus", warm);
      video.removeEventListener("ended", beginHandoff);
      trigger?.removeEventListener("click", playToHalls);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("resize", cancel);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className="hero-halls-canvas-layer"
      data-playing="false"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className="hero-halls-transition-video"
        muted
        playsInline
        preload="none"

      >
        <source src="/video/hero-to-halls.mp4" type="video/mp4" />
        <source src="/video/hero-to-halls.webm" type="video/webm" />
      </video>
    </div>
  );
}
