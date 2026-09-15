/** Shared input and navigation helpers. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!/^[+\d\s().-]*$/.test(raw.trim())) return null;
  if (!raw.trim().startsWith("+") && digits.length === 10) return "+7" + digits;
  if (digits.length === 11 && /^[78]/.test(digits)) return "+7" + digits.slice(1);
  if (raw.trim().startsWith("+") && /^[1-9]\d{7,14}$/.test(digits)) return "+" + digits;
  return null;
}
/** Номер абонента из уже набранного значения: без кода страны, если это +7. */
function subscriberOf(value: string) {
  const digits = value.replace(/\D/g, "");
  return value.trim().startsWith("+7") ? digits.slice(1) : digits;
}

/**
 * Маска телефона: «+7 (916) 123-45-67» — разделители появляются по мере
 * набора. Российский номер можно начать с 8, 7 или сразу с кода города —
 * +7 подставится сам. Номер другой страны начинают с «+» и кода не 7: его
 * оставляем цифрами без маски, проверку делает normalizePhone.
 *
 * prev — значение до правки: стёрли разделитель — стираем и цифру перед ним,
 * иначе маска тут же дописала бы разделитель обратно и Backspace «застревал».
 */
export function formatPhone(next: string, prev: string) {
  const raw = next.trim();
  const deleting = next.length < prev.length;
  let digits = raw.replace(/\D/g, "");

  if (raw.startsWith("+") && digits[0] !== "7") {
    if (!digits) return deleting ? "" : "+";
    return "+" + digits.slice(0, 15);
  }

  /*
    Код страны снимаем, только когда он точно код: после «+», у одиннадцати
    цифр или первой набранной цифрой. Десять цифр с 8 впереди — это номер с
    кодом города (812…), его не трогаем.
  */
  if (/^[78]/.test(digits) && (raw.startsWith("+") || digits.length > 10 || digits.length === 1)) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (deleting && digits.length && digits.length === subscriberOf(prev).length) {
    digits = digits.slice(0, -1);
  }
  if (!digits) return deleting ? "" : "+7 (";

  let out = `+7 (${digits.slice(0, 3)}`;
  if (digits.length >= 3) out += ")";
  if (digits.length > 3) out += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`;
  return out;
}

/**
 * Ник в мессенджере: собачка ставится сама и всегда одна, внутри — только
 * латиница, цифры и подчёркивание (других символов в нике не допускают ни
 * Telegram, ни MAX). Если набирают ссылку — t.me/…, max.ru/… — оставляем как
 * есть: точка, слэш или двоеточие и есть признак ссылки.
 */
export function formatMessenger(raw: string) {
  const value = raw.replace(/\s/g, "");
  const body = value.replace(/^@+/, "");
  if (/[./:]/.test(body)) return body;
  const handle = body.replace(/[^A-Za-z0-9_]/g, "");
  return handle ? "@" + handle : "";
}

export function normalizeMessenger(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^@[A-Za-z0-9_]{3,64}$/.test(value)) return value;
  if (/^[A-Za-z0-9_]{3,64}$/.test(value)) return "@" + value;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value);
    if (url.protocol !== "https:" || !["t.me", "telegram.me", "max.ru"].includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash) return null;
    if (!/^\/[A-Za-z0-9_+/-]+$/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}
