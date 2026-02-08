import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/site";
import { PDF_TOOLS, getToolHref } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths = ["/", "/privacy", "/terms"];
  const toolPaths = PDF_TOOLS.map((tool) => getToolHref(tool.slug));

  return [...staticPaths, ...toolPaths].map((path) => ({
    url: getAbsoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
