import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "monthly", priority: 1 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/services", changeFrequency: "monthly", priority: 0.8 },
    { path: "/booking", changeFrequency: "monthly", priority: 0.9 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  ];

  return routes.map((route) => ({
    url: `${siteConfig.siteUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
