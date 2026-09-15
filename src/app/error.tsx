"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main-content" className="legal-page"><h1>Не удалось открыть страницу</h1><p>Попробуй ещё раз. Сохранённый черновик останется в этой вкладке.</p><button type="button" onClick={reset}>Повторить</button> · <Link href="/">На главную</Link></main>; }
