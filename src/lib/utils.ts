import { RouteConfig, RouteValue, RouteValueEntry } from "./types";

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
