"use client";

import { useEffect, useId, useRef } from "react";
import { LEGAL, type LegalId } from "@/lib/legal";

/**
 * Юридические документы поверх страницы.
 *
 * Собрано на <dialog> с showModal(): браузер сам запирает фокус внутри окна,
 * гасит фон и закрывает по Escape — руками это повторять незачем.
 *
 * Кегль внутри задан в clamp с пределами в пикселях, а не в rem макета:
 * документ читают, и он должен оставаться читаемым и на ноутбуке, где
 * масштаб макета падает до 0.71, и на 4K, где он доходит до 2.5.
 */
export default function LegalModal({
  id,
  onClose,
}: {
  id: LegalId | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  /*
    Окон на странице два — в подвале и под формой, — поэтому идентификатор
    заголовка выдаёт React. С жёстким id в разметке оказывалось два элемента
    с одним и тем же id, и aria-labelledby указывал непонятно на какой.
  */
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (id && !el.open) el.showModal();
    if (!id && el.open) el.close();
  }, [id]);

  const doc = id ? LEGAL[id] : null;

  return (
    <dialog
      ref={ref}
      className="u-legal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // клик мимо панели — по самому <dialog> — закрывает окно
        if (e.target === ref.current) onClose();
      }}
    >
      {doc ? (
        <article className="u-legal-panel">
          <header className="u-legal-head">
            <p className="u-legal-kicker">{doc.kicker}</p>
            <h2 id={titleId} className="u-legal-title">
              {doc.title}
            </h2>
            {doc.lede ? <p className="u-legal-lede">{doc.lede}</p> : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="u-legal-close"
            >
              <svg viewBox="0 0 14 14" aria-hidden fill="none">
                <path
                  d="M2 2l10 10M12 2L2 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div className="u-legal-body">
            {doc.sections.map((s, si) => (
              <section key={s.h + si}>
                {s.h ? <h3>{s.h}</h3> : null}
                {s.blocks.map((b, bi) => {
                  if ("p" in b) return <p key={bi}>{b.p}</p>;
                  if ("ul" in b)
                    return (
                      <ul key={bi}>
                        {b.ul.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    );
                  return (
                    <dl key={bi}>
                      {b.dl.map(([t, d]) => (
                        <div key={t}>
                          <dt>{t}</dt>
                          <dd>{d}</dd>
                        </div>
                      ))}
                    </dl>
                  );
                })}
              </section>
            ))}
            <p><a href={"/" + id} className="u-legal-link">Открыть отдельной страницей</a></p>
            <p className="u-legal-version">{doc.version}</p>
          </div>
        </article>
      ) : null}
    </dialog>
  );
}
