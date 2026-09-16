import test from "node:test";
import assert from "node:assert/strict";
import { buildLead, isAcceptedLead, CONSENT_VERSION, POLICY_VERSION } from "../src/lib/lead-payload.mjs";
import { resolveAttribution } from "../src/lib/attribution.mjs";

const order = { name: "Тест", hall: "", pkg: "extra", pkgTouched: false, hours: 5, hoursTouched: false, date: "2026-12-12", dateTouched: false, guests: "до 15 чел.", wish: "Пожелание" };
const pkg = { short: "Экстра", price: 32500 };
const details = { requestId: "test-request-123456", consentAt: "2026-09-16T15:00:00.000Z", messenger: "@test_user", total: 77500, path: "/" };
test("suggestions and guest ranges never become confirmed selections", () => {
  const lead = buildLead(order, pkg, "+70000000000", {}, details);
  assert.equal(lead.event_date, ""); assert.equal(lead.tariff, "help");
  assert.equal(lead.guests, 0); assert.equal(lead.hall, "help"); assert.equal(lead.base_estimate, 0);
  assert.match(lead.question, /до 15 чел\./); assert.match(lead.question, /не выбор клиента/);
  assert.match(lead.question, /@test_user/); assert.match(lead.question, /Пожелание/);
});
test("chosen values, all nine halls, consent and attribution survive mapping", () => {
  const halls = { "Фламинго": "flamingo", "Вайт": "white", "Блэк": "black", "Барби": "barbi", "Сицилия": "sicily", "Оушен Драйв": "ocean-drive", "Леонардо": "leonardo", "Санта-Лючия": "santa-lucia", "Рубин Холл": "rubinhall" };
  for (const [hall, code] of Object.entries(halls)) {
    const lead = buildLead({ ...order, hall, pkgTouched: true, dateTouched: true, hoursTouched: true }, pkg, "+70000000000", { utm_source: "ya_direct", yclid: "12345" }, details);
    assert.equal(lead.hall, code); assert.equal(lead.event_date, "2026-12-12");
    assert.equal(lead.tariff, "extra"); assert.equal(lead.base_estimate, 77500);
    assert.equal(lead.consent, true); assert.equal(lead.consented_at, details.consentAt);
    assert.equal(lead.consent_version, CONSENT_VERSION); assert.equal(lead.policy_version, POLICY_VERSION);
    assert.equal(lead.request_id, details.requestId); assert.equal(lead.yclid, "12345");
  }
});
test("success requires a saved lead number including queued delivery", () => {
  for (const value of [null, {}, { accepted: true }, { accepted: false, leadNumber: 1 }, { accepted: true, leadNumber: 0 }]) assert.equal(isAcceptedLead(value), false);
  assert.equal(isAcceptedLead({ accepted: true, leadNumber: 42, telegramDelivered: false, amocrmDelivered: false }), true);
});
test("tags survive navigation and a new tagged visit replaces the previous source", () => {
  const map = new Map(); const storage = { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) };
  resolveAttribution("?utm_source=ya_direct&utm_campaign=test&yclid=12345", storage);
  assert.equal(resolveAttribution("", storage).yclid, "12345");
  assert.equal(resolveAttribution("?utm_source=telegram", storage).yclid, "");
  assert.equal(resolveAttribution("", storage).utm_source, "telegram");
});
