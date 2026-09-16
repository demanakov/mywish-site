export const attributionFields = Object.freeze([
  "yclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "matched_keyword",
  "region_id",
]);

const attributionLimits = Object.freeze({
  yclid: 128,
  utm_source: 200,
  utm_medium: 200,
  utm_campaign: 200,
  utm_content: 200,
  utm_term: 200,
  matched_keyword: 300,
  region_id: 16,
});

const attributionStorageKey = "mywish.attribution.v1";

export function emptyAttribution() {
  return Object.fromEntries(attributionFields.map((field) => [field, ""]));
}

function normalizeAttributionValue(field, value) {
  const normalized = String(value ?? "")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .trim();

  if (!normalized) return "";
  if (field === "yclid") {
    return /^[A-Za-z0-9_-]{1,128}$/.test(normalized) ? normalized : "";
  }
  if (field === "region_id") {
    return /^[0-9]{1,16}$/.test(normalized) ? normalized : "";
  }

  return normalized.slice(0, attributionLimits[field] ?? 200);
}

export function normalizeAttribution(candidate) {
  const normalized = emptyAttribution();

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return normalized;
  }

  attributionFields.forEach((field) => {
    normalized[field] = normalizeAttributionValue(field, candidate[field]);
  });

  return normalized;
}

export function resolveAttribution(search, storage) {
  const params = new URLSearchParams(search || "");
  const queryAttribution = normalizeAttribution(
    Object.fromEntries(
      attributionFields.map((field) => [field, params.get(field) || ""]),
    ),
  );
  const hasTaggedTouch = attributionFields.some(
    (field) => queryAttribution[field] !== "",
  );

  if (hasTaggedTouch) {
    try {
      storage?.setItem(
        attributionStorageKey,
        JSON.stringify(queryAttribution),
      );
    } catch {
      // Атрибуция текущего входа остаётся доступной без sessionStorage.
    }
    return queryAttribution;
  }

  try {
    const stored = storage?.getItem(attributionStorageKey);
    return stored
      ? normalizeAttribution(JSON.parse(stored))
      : queryAttribution;
  } catch {
    return queryAttribution;
  }
}

export function sourceBucketFromAttribution(attribution) {
  const source = String(attribution?.utm_source || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (source === "rubin_loft_crm") return "rubin_loft_crm";
  if (["yandex_maps", "ya_maps", "yandex_karty", "maps"].includes(source)) {
    return "yandex_maps";
  }
  if (
    ["ya_direct", "yandex_direct", "yandex", "direct"].includes(source) ||
    attribution?.yclid
  ) {
    return "ya_direct";
  }
  if (["vk", "vkontakte", "vk_ads", "vk_reklama"].includes(source)) {
    return "vk";
  }
  if (["avito", "avito_ads"].includes(source)) return "avito";
  if (["google_maps", "google_business"].includes(source)) {
    return "google_maps";
  }
  if (["instagram", "insta", "ig"].includes(source)) return "instagram";
  if (["telegram", "tg"].includes(source)) return "telegram";
  if (["2gis", "doublegis"].includes(source)) return "2gis";
  if (["partner", "partners", "referral", "affiliate"].includes(source)) {
    return "partner";
  }
  if (source) return "other_tagged";
  return "direct_or_unknown";
}
