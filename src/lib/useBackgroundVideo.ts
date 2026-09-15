"use client";
import { useEffect, type RefObject } from "react";

/** Play only the visible, active background. Resumes after the browser pauses it. */
export function useBackgroundVideo(ref: RefObject<HTMLVideoElement | null>, active: boolean) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let inView = false;
    const update = () => {
      const visible = active && !document.hidden && inView && video.getBoundingClientRect().width > 0;
      if (visible) {
        video.muted = true;
        if (video.paused && !video.ended) video.play().catch(() => {});
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    observer.observe(video);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("resize", update);
    window.addEventListener("focus", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); window.removeEventListener("resize", update); window.removeEventListener("focus", update); video.pause(); };
  }, [ref, active]);
}
