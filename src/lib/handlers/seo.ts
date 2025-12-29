/**
 * @file seo.ts
 * @description
 * [EN] SEO Utilities.
 * Provides helpers to generate `robots.txt` and `sitemap.xml` based on compiled route rules.
 *
 * [CN] SEO 工具集。
 * 基于已编译的路由规则生成 `robots.txt` 和 `sitemap.xml`。
 *
 * @see {@link https://github.com/IGCyukira/i0c.cc} for repository info.
 */

import { buildCompiledList } from "./matcher";
import { readBindingVar, readEnvVar } from "./env";
import type { RouteValueEntry } from "./types";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

export function resolveRobotsPolicy(bindings?: Record<string, unknown>): string | undefined {
  const fromEnv = readEnvVar("ROBOTS_POLICY");
  if (fromEnv) return fromEnv;
  return readBindingVar(bindings, "ROBOTS_POLICY");
}

export function isRobotsAllowed(bindings?: Record<string, unknown>): boolean {
  const policy = resolveRobotsPolicy(bindings)?.toLowerCase();
  return policy === "allow"; // default deny
}

export function generateRobots(origin: string, bindings?: Record<string, unknown>): string {
  const sitemapUrl = `${origin.replace(/\/$/, "")}/sitemap.xml`;
  const allowAll = isRobotsAllowed(bindings);

  const lines = ["User-agent: *", allowAll ? "Allow: /" : "Disallow: /"];
  if (allowAll) {
    lines.push(`Sitemap: ${sitemapUrl}`);
  }

  return lines.join("\n") + "\n";
}

export function generateSitemapXml(origin: string, rulesIn: Record<string, RouteValueEntry>): string {
  const compiled = buildCompiledList(rulesIn);
  const urls = new Set<string>();

  for (const item of compiled) {
    if (item.isParam) continue;

    const path = item.base === "/" ? "/" : item.base;
    urls.add(`${origin.replace(/\/$/, "")}${path}`);
  }

  const urlEntries = Array.from(urls).map(u => `  <url>\n    <loc>${escapeXml(u)}</loc>\n  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}
