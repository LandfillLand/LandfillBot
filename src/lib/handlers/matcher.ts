/**
 * @file matcher.ts
 * @description
 * [EN] Routing Engine & Matcher.
 * The core engine responsible for compiling routing rules into regex, flattening configuration slots,
 * and performing the actual pattern matching against request paths.
 *
 * [CN] 路由引擎与匹配器。
 * 核心引擎，负责将路由规则编译为正则、展平配置插槽（Slots），
 * 并针对请求路径执行实际的模式匹配。
 *
 * @see {@link https://github.com/IGCyukira/i0c.cc} for repository info.
 */

import { coerceRouteValues, isRecord, toRouteArray } from "./utils";
import { DEFAULT_STATUS } from "./constants";
import { CompiledEntry, NormalizedRule, RedirectsConfig, RouteConfig, RouteType, RouteValue, RouteValueEntry, SlotBranch } from "./types";

export function getSlotSource(config: RedirectsConfig | null): SlotBranch | null {
  if (!config) {
    return null;
  }
  const slotCandidate = config.Slots ?? config.slots ?? config.SLOT;
  return isRecord(slotCandidate) ? slotCandidate : null;
}

export function flattenSlots(source: SlotBranch, out: Record<string, RouteValueEntry>): void {
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith("/")) {
      const additions = coerceRouteValues(value);
      if (!additions.length) {
        continue;
      }

      const existing = out[key];
      if (!existing) {
        out[key] = additions.length === 1 ? additions[0] : additions;
      } else {
        const existingList = Array.isArray(existing) ? existing : [existing];
        const combined = existingList.concat(additions);
        out[key] = combined.length === 1 ? combined[0] : combined;
      }
    } else if (isRecord(value)) {
      flattenSlots(value, out);
    }
  }
}

export function buildCompiledList(rulesIn: Record<string, RouteValueEntry>): CompiledEntry[] {
  const list: CompiledEntry[] = [];
  let sequence = 0;

  for (const [rawKey, rawValue] of Object.entries(rulesIn)) {
    let base = rawKey.startsWith("/") ? rawKey : `/${rawKey}`;
    if (base.length > 1 && base.endsWith("/")) {
      base = base.slice(0, -1);
    }

    const values = toRouteArray(rawValue);
    let fallbackPriority = 0;

    for (const entry of values) {
      fallbackPriority += 1;
      const rule = normaliseRule(entry, fallbackPriority);
      if (!rule) {
        continue;
      }

      const compiled = compilePattern(base);
      list.push({ base, rule, ...compiled, order: sequence });
      sequence += 1;
    }
  }

  list.sort((a, b) => {
    if (b.base.length !== a.base.length) {
      return b.base.length - a.base.length;
    }
    if (a.rule.priority !== b.rule.priority) {
      return a.rule.priority - b.rule.priority;
    }
    return a.order - b.order;
  });
  return list;
}

function normaliseRule(value: RouteValue, fallbackPriority: number): NormalizedRule | null {
  if (typeof value === "string") {
    return { type: "prefix", target: value, appendPath: true, status: DEFAULT_STATUS, priority: fallbackPriority };
  }

  if (value && typeof value === "object") {
    const type: RouteType = value.type === "exact" ? "exact" : value.type === "proxy" ? "proxy" : "prefix";
    const target = value.target ?? value.to ?? value.url ?? "";
    const appendPath = value.appendPath !== undefined ? Boolean(value.appendPath) : true;
    const parsedStatus = Number(value.status);
    const status = Number.isFinite(parsedStatus) ? parsedStatus : DEFAULT_STATUS;
    const parsedPriority = Number((value as RouteConfig).priority);
    const priority = Number.isFinite(parsedPriority) ? parsedPriority : fallbackPriority;

    return { type, target, appendPath, status, priority };
  }

  return null;
}

export function compilePattern(pattern: string): Pick<CompiledEntry, "regex" | "names" | "isParam"> {
  if (pattern === "/") {
    return { regex: /^\/$/, names: [], isParam: false };
  }

  const parts = pattern.split("/").slice(1);
  const names: string[] = [];
  let regexStr = "^";
  let isParam = false;

  for (const part of parts) {
    regexStr += "/";
    if (part === "*") {
      regexStr += "(.*)";
      isParam = true;
    } else if (part.startsWith(":")) {
      const name = part.slice(1);
      names.push(name);
      regexStr += "([^/]+)";
      isParam = true;
    } else {
      regexStr += part.replace(/([.+?^=!:${}()|[\]\\])/g, "\\$1");
    }
  }

  regexStr += "$";
  return { regex: new RegExp(regexStr), names, isParam };
}

export function applyTemplate(target: string, match: RegExpMatchArray, names: string[]): string {
  const groups = match.slice(1);
  let output = String(target);

  output = output.replace(/\$(\d+)/g, (_, rawIndex: string) => {
    const index = Number(rawIndex) - 1;
    return groups[index] === undefined ? "" : groups[index];
  });

  output = output.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
    const index = names.indexOf(name);
    return index >= 0 && groups[index] !== undefined ? groups[index] : "";
  });

  return output;
}

export function resolvePrefixTarget(pathname: string, search: string, rule: NormalizedRule, base: string): string | null {
  const targetBase = String(rule.target).replace(/\/$/, "");
  const query = search || "";

  if (base === "/") {
    const rest = pathname === "/" ? "" : pathname;
    const resolved = rule.appendPath ? `${targetBase}${rest}` : targetBase;
    return `${resolved}${query}`;
  }

  if (pathname === base || pathname.startsWith(`${base}/`)) {
    let rest = pathname.slice(base.length);
    rest = rest.startsWith("/") ? rest : rest ? `/${rest}` : "";
    const resolved = rule.appendPath ? `${targetBase}${rest}` : targetBase;
    return `${resolved}${query}`;
  }

  return null;
}

export function appendOriginalQuery(target: string, search: string): string {
  if (!search) {
    return target;
  }
  return target.includes("?") ? target : `${target}${search}`;
}
