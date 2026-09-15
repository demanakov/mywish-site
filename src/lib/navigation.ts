/** Shared input and navigation helpers. */
export function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  if (location.hash !== '#' + id) history.pushState(null, "", '#' + id);
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}
