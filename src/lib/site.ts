import type { Metadata } from "next";
const configured = process.env.NEXT_PUBLIC_SITE_URL;
export const siteUrl = configured ? new URL(configured) : undefined;
export function pageMetadata(title: string, path: string): Metadata {
 return { title, ...(siteUrl ? { metadataBase: siteUrl, alternates: { canonical: path }, openGraph: { title, url: path, siteName: "MyWish", locale: "ru_RU", type: "website", images: [{ url: "/social-preview.jpg", width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", title, images: ["/social-preview.jpg"] } } : {}) };
}
