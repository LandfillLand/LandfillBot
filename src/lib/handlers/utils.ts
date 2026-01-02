/**
 * @file utils.ts
 * @description
 * [EN] Utility Functions.
 * Provides pure helper functions for common operations like JSON parsing, URL decoding,
 * path normalization, and data type coercion.
 *
 * [CN] 工具函数。
 * 提供纯辅助函数，用于 JSON 解析、URL 解码、路径标准化和数据类型转换等常见操作。
 *
 * @see {@link https://github.com/IGCyukira/i0c.cc} for repository info.
 */

import { CompiledEntry, RouteConfig, RouteValue, RouteValueEntry } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function safeParseJson<T>(text: string, label: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(label, error);
    return null;
  }
}

export function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function normalisePath(pathname: string): string {
  let normalised = pathname.replace(/\/{2,}/g, "/");
  if (normalised.length > 1 && normalised.endsWith("/")) {
    normalised = normalised.slice(0, -1);
  }
  return normalised || "/";
}

export function toRouteArray(entry: RouteValueEntry): RouteValue[] {
  return Array.isArray(entry) ? entry : [entry];
}

export function coerceRouteValues(input: unknown): RouteValue[] {
  if (Array.isArray(input)) {
    const result: RouteValue[] = [];
    for (const item of input) {
      if (typeof item === "string") {
        result.push(item);
      } else if (isRecord(item)) {
        result.push(item as RouteConfig);
      }
    }
    return result;
  }

  if (typeof input === "string") {
    return [input];
  }

  if (isRecord(input)) {
    return [input as RouteConfig];
  }

  return [];
}

export function inferEffectivePath(decodedPath: string, headers: Headers, compiledList: CompiledEntry[]): string {
  let effectivePath = decodedPath;
  const isRootFrameworkAsset = /^\/(_next|_nuxt)(\/|$)/.test(decodedPath);
  const referer = headers.get("referer") || headers.get("referrer");

  if (isRootFrameworkAsset && referer) {
    try {
      const refUrl = new URL(referer);
      const refPath = normalisePath(refUrl.pathname);

      let bestBase: string | null = null;
      for (const entry of compiledList) {
        if (entry.rule.type !== "proxy") continue;
        const base = entry.base;
        if (base === "/") continue;
        if (refPath === base || refPath.startsWith(`${base}/`)) {
          if (!bestBase || base.length > bestBase.length) {
            bestBase = base;
          }
        }
      }

      if (bestBase) {
        effectivePath = `${bestBase}${decodedPath}`;
      }
    } catch {
      // ignore invalid referer
    }
  }

  return effectivePath;
}

export function isLikelyStaticAssetPath(pathname: string): boolean {
  return (
    /(?:^|\/)(_next|_nuxt)(?:\/|$)/.test(pathname) ||
    /(?:^|\/)(assets|static|images|img|fonts)(?:\/|$)/i.test(pathname) ||
    /\.(?:js|mjs|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot)$/i.test(pathname)
  );
}
