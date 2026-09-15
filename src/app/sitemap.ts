import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap { return siteUrl ? ["/", "/halls", "/privacy", "/consent", "/cookies", "/requisites", "/menu"].map(path => ({ url: new URL(path, siteUrl).href })) : []; }
