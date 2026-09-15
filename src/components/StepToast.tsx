"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { useOrder } from "@/lib/order";
import { MONTHS_OF, getPackage } from "@/lib/pricing";

/**
 * Закрытие шага, когда номер шага не на экране.
 *
 * Закрытый шаг отмечается на месте: номер над заголовком сменяется галочкой
 * (StepDone). Но выбирают обычно ниже заголовка — этаж в доме, пакет в
 * ленте, число в календаре, — и номер в этот момент уже уехал за верх
 * экрана: подтверждение случалось там, где его никто не видел.
 *
 * Тогда тот же момент отыгрывает плашка внизу экрана: та же галочка с
 * впечатыванием и искрами, что говорит «шаг закрыт», что выбрано и куда
 * дальше. Плашка не перекрывает работу: сама уходит через несколько секунд,
 * нажатие по ней убирает её сразу, ссылка ведёт к следующему шагу.
 *
 * Сигнал присылает StepDone — только если номер шага за экраном.
 */

type Closable = "hall" | "package" | "date";

const INFO: Record<Closable, { n: number; title: string; next: string; href: string }> = {
  hall: { n: 1, title: "Зал выбран", next: "К пакету", href: "#packages" },
  package: { n: 2, title: "Пакет выбран", next: "К дате", href: "#price" },
  date: { n: 3, title: "Дата выбрана", next: "К заявке", href: "#contact" },
};

const SHOW_MS = 3600;

const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
  const far = 1.35 + (i % 3) * 0.25;
  return {
    dx: (Math.cos(angle) * far).toFixed(2) + "rem",
    dy: (Math.sin(angle) * far).toFixed(2) + "rem",
    i,
  };
});

export default function StepToast() {
  const order = useOrder();
  const [toast, setToast] = useState<{ step: Closable; key: number } | null>(null);
  const [shown, setShown] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const onDone = (event: Event) => {
      const step = (event as CustomEvent<{ step?: string }>).detail?.step;
      if (!step || !(step in INFO)) return;
      window.clearTimeout(timer.current);
      /* Новая плашка монтируется скрытой и через кадр выезжает — анимация играет заново. */
      setShown(false);
      setToast({ step: step as Closable, key: Date.now() });
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      timer.current = window.setTimeout(() => setShown(false), SHOW_MS);
    };
    window.addEventListener("mywish:step-done", onDone);
    return () => {
      window.removeEventListener("mywish:step-done", onDone);
      window.clearTimeout(timer.current);
    };
  }, []);

  /* Выбор сняли, пока плашка на экране, — прячем её: шаг уже не закрыт. */
  const stillDone = !toast
    ? false
    : toast.step === "hall"
      ? Boolean(order.hall)
      : toast.step === "package"
        ? order.pkgTouched
        : order.dateTouched;
  const visible = shown && stillDone;

  const info = toast ? INFO[toast.step] : null;
  let detail = "";
  if (toast?.step === "hall") detail = order.hall;
  if (toast?.step === "package") detail = `пакет ${getPackage(order.pkg).title}`;
  if (toast?.step === "date" && order.date) {
    const [, m, d] = order.date.split("-").map(Number);
    detail = `${d} ${MONTHS_OF[m - 1]}`;
  }

  const onCard = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target as HTMLElement).closest("a")) setShown(false);
  };

  return (
    <div className="step-toast" data-shown={visible} aria-hidden={!visible} inert={!visible} role="status" aria-live="polite">
      {toast && info ? (
        <div key={toast.key} className="step-toast-card" onClick={onCard}>
          <span className="step-toast-mark" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/steps/done.webp" alt="" />
            {SPARKS.map((s) => (
              <i key={s.i} style={{ "--dx": s.dx, "--dy": s.dy, "--i": s.i } as CSSProperties} />
            ))}
          </span>
          <span className="step-toast-text">
            <b>{info.title}</b>
            <small>
              Шаг {info.n} из 4{detail ? ` · ${detail}` : ""}
            </small>
          </span>
          <a
            href={info.href}
            className="step-toast-next"
            tabIndex={visible ? 0 : -1}
            onClick={() => setShown(false)}
          >
            {info.next} →
          </a>
        </div>
      ) : null}
    </div>
  );
}
