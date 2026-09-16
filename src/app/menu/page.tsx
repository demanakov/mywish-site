import Link from "next/link";
import { MENU } from "@/lib/menu";
import { money } from "@/lib/pricing";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata("Меню MyWish - блюда, состав и цены", "/menu");
export default function MenuPage() {
  return <main id="main-content" tabIndex={-1} className="legal-page"><nav><Link href="/#packages">← К пакетам</Link><Link href="/packages/food/menu/mywish-menu.pdf">Меню с фотографиями (PDF)</Link></nav><h1>Меню для твоего праздника</h1><p>Цена указана за порцию или бокс указанного объёма. Состав заказа согласуем с личным менеджером.</p>{MENU.map(([name, price, portion, ingredients]) => <section key={name}><h2>{name}</h2><p><strong>{money(price)}</strong> · {portion}</p>{ingredients && <p>{ingredients}</p>}</section>)}</main>;
}
