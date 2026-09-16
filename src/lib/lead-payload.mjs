const halls = {
  "Фламинго": "flamingo", "Вайт": "white", "Блэк": "black", "Барби": "barbi",
  "Сицилия": "sicily", "Оушен Драйв": "ocean-drive", "Леонардо": "leonardo",
  "Санта-Лючия": "santa-lucia", "Рубин Холл": "rubinhall",
};

export const FORM_ID = "main_dmitry_request";
export const CONSENT_VERSION = "mywish-consent-2026-08-13";
export const POLICY_VERSION = "mywish-privacy-2026-08-20";

/** Map the shared form to the existing PHP API. Estimates are not selections. */
export function buildLead(order, pkg, contact, attribution, details) {
  const notes = [
    order.pkgTouched ? `Пакет: ${pkg.short}, ${pkg.price} ₽ без аренды.` : "Пакет не выбран.",
    `Длительность: ${order.hours} ч${order.hoursTouched ? "." : " (расчёт, не выбор клиента)."}`,
    order.guests ? `Гостей: ${order.guests}` : "",
    details.messenger ? `Мессенджер: ${details.messenger}` : "",
    order.date && Number.isFinite(details.total)
      ? `Расчёт на экране: ${details.total} ₽ (${pkg.short}, ${order.hours} ч).`
      : "",
    order.wish.trim(),
  ].filter(Boolean);
  return {
    ...attribution,
    request_id: details.requestId,
    name: order.name.trim(), contact,
    contact_channel: "phone", contact_time: "в любое время",
    consent: true, consent_version: CONSENT_VERSION, policy_version: POLICY_VERSION,
    consented_at: details.consentAt,
    website: details.website || "",
    event_date: order.dateTouched ? order.date || "" : "",
    // Ranges are retained in the note; an upper bound is not an exact guest count.
    guests: 0,
    hall: halls[order.hall] || "help",
    tariff: order.pkgTouched ? order.pkg : "help",
    base_estimate: order.dateTouched && order.pkgTouched && order.hoursTouched
      ? Math.round(details.total) : 0,
    rate_group: "unknown", extras: "Заявка с главной MyWish",
    question: notes.join("\n"),
    form_id: FORM_ID, form_label: "Главная MyWish – заявка",
    landing_path: details.path,
  };
}

export function isAcceptedLead(response) {
  return response?.accepted === true && Number.isInteger(response.leadNumber) && response.leadNumber > 0;
}
