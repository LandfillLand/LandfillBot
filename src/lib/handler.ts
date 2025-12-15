import { base64Icon } from "@/assets/favicon.ts";

declare const process: undefined | { env?: Record<string, string | undefined> };
declare const Deno: undefined | { env?: { get?(key: string): string | undefined } };

function readEnvVar(key: string): string | undefined {
  if (typeof process !== "undefined" && process?.env) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  if (typeof Deno !== "undefined" && typeof Deno?.env?.get === "function") {
    try {
      const value = Deno.env.get(key);
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    } catch {
      // Deno Deploy may forbid env access; ignore silently.
    }
  }

  if (typeof globalThis === "object" && globalThis) {
    const raw = (globalThis as Record<string, unknown>)[key];
    if (typeof raw === "string" && raw.length > 0) {
      return raw;
    }
  }

  return undefined;
}

function readEnvPriority(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readEnvVar(key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function readBindingVar(bindings: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!bindings) {
    return undefined;
  }

  const raw = bindings[key];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

const ENV_CONFIG_REPO = readEnvPriority(["REDIRECTS_CONFIG_REPO", "CONFIG_REPO"]);
const ENV_CONFIG_BRANCH = readEnvPriority(["REDIRECTS_CONFIG_BRANCH", "CONFIG_BRANCH"]);
const ENV_CONFIG_PATH = readEnvPriority(["REDIRECTS_CONFIG_PATH", "CONFIG_PATH"]);
const CONFIG_REPO = ENV_CONFIG_REPO ?? "IGCyukira/i0c.cc";
const CONFIG_BRANCH = ENV_CONFIG_BRANCH ?? "data";
const CONFIG_PATH = ENV_CONFIG_PATH ?? "redirects.json";

export function buildConfigUrl(parts?: { repo?: string; branch?: string; path?: string }): string {
  const repo = parts?.repo ?? CONFIG_REPO;
  const branch = parts?.branch ?? CONFIG_BRANCH;
  const path = parts?.path ?? CONFIG_PATH;
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

const ENV_CONFIG_URL = readEnvPriority(["REDIRECTS_CONFIG_URL", "CONFIG_URL"]);
export const DEFAULT_CONFIG_URL = ENV_CONFIG_URL ?? buildConfigUrl();

export function resolveConfigUrlFromBindings(bindings?: Record<string, unknown>): string | undefined {
  if (bindings && typeof bindings === "object") {
    const direct = readBindingVar(bindings, "REDIRECTS_CONFIG_URL") ?? readBindingVar(bindings, "CONFIG_URL");
    if (direct) {
      return direct;
    }

    const repo = readBindingVar(bindings, "REDIRECTS_CONFIG_REPO") ?? readBindingVar(bindings, "CONFIG_REPO");
    const branch = readBindingVar(bindings, "REDIRECTS_CONFIG_BRANCH") ?? readBindingVar(bindings, "CONFIG_BRANCH");
    const path = readBindingVar(bindings, "REDIRECTS_CONFIG_PATH") ?? readBindingVar(bindings, "CONFIG_PATH");

    if (repo || branch || path) {
      return buildConfigUrl({ repo: repo ?? undefined, branch: branch ?? undefined, path: path ?? undefined });
    }
  }

  return ENV_CONFIG_URL ?? undefined;
}

type RouteType = "prefix" | "exact" | "proxy";

type RouteValue = string | RouteConfig;
type RouteValueEntry = RouteValue | RouteValue[];

interface RouteConfig {
  type?: string;
  target?: string;
  to?: string;
  url?: string;
  appendPath?: boolean;
  status?: number;
  priority?: number;
}

interface NormalizedRule {
  type: RouteType;
  target: string;
  appendPath: boolean;
  status: number;
  priority: number;
}

interface CompiledEntry {
  base: string;
  rule: NormalizedRule;
  regex: RegExp;
  names: string[];
  isParam: boolean;
  order: number;
}

type SlotBranch = Record<string, unknown>;

interface RedirectsConfig {
  Slots?: SlotBranch;
  slots?: SlotBranch;
  SLOT?: SlotBranch;
  [key: string]: unknown;
}

const HTTPS_REDIRECT_STATUS = 308;
const DEFAULT_STATUS = 302;
const HSTS_HEADER_VALUE = "max-age=63072000; includeSubDomains";
const DEFAULT_CACHE_TTL_SECONDS = 3600;

interface MemoryCacheEntry {
  text: string;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();

export interface CacheLike {
  match(request: Request): Promise<Response | undefined | null>;
  put(request: Request, response: Response): Promise<void>;
}

export interface HandlerOptions {
  configUrl?: string;
  cache?: CacheLike;
  cacheTtlSeconds?: number;
  fetchImpl?: typeof fetch;
  fetchInit?: RequestInit;
  waitUntil?(promise: Promise<unknown>): void;
  now?: () => number;
}

interface ResolvedRuntime {
  configUrl: string;
  cache?: CacheLike;
  cacheTtlSeconds: number;
  fetchImpl: typeof fetch;
  fetchInit?: RequestInit;
  waitUntil?: (promise: Promise<unknown>) => void;
  now: () => number;
}

export async function handleRedirectRequest(request: Request, options: HandlerOptions = {}): Promise<Response> {
  const runtime = resolveRuntimeOptions(options);
  const url = new URL(request.url);
  const path = normalisePath(url.pathname || "/");

  if (needsHttpsRedirect(url)) {
    const hostname = url.hostname.startsWith("www.") ? url.hostname.replace(/^www\./, "") : url.hostname;
    const destination = `https://${hostname}${url.pathname}${url.search}`;
    return Response.redirect(destination, HTTPS_REDIRECT_STATUS);
  }

  if (path === "/favicon.ico") {
    return serveFavicon();
  }

  const redirectsConfig = await loadConfig(runtime);
  const slotSource = getSlotSource(redirectsConfig);
  if (!slotSource) {
    return new Response("503 No Slots configured", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  const rawRules: Record<string, RouteValueEntry> = {};
  flattenSlots(slotSource, rawRules);

  const compiledList = buildCompiledList(rawRules);
  const decodedPath = safeDecode(path);

  for (const item of compiledList) {
    const { rule, regex, names, isParam, base } = item;
    if (!rule.target) {
      continue;
    }

    const match = decodedPath.match(regex);
    if (match) {
      const resolved = applyTemplate(rule.target, match, names);
      const finalUrl = appendOriginalQuery(resolved, url.search);
      return respondUsingRule(request, rule, finalUrl, runtime);
    }

    if (rule.type === "prefix" && !isParam) {
      const redirectTarget = resolvePrefixTarget(decodedPath, url.search, rule, base);
      if (redirectTarget) {
        return respondUsingRule(request, rule, redirectTarget, runtime);
      }
    }
  }

  return new Response("404 Not Found - 链接不存在", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

function resolveRuntimeOptions(options: HandlerOptions): ResolvedRuntime {
  const fetchImpl: typeof fetch =
    options.fetchImpl ??
    (typeof globalThis.fetch === "function"
      ? (globalThis.fetch.bind(globalThis) as typeof fetch)
      : ((() => {
          throw new Error("fetch is not available in this environment");
        }) as unknown as typeof fetch));
  const cacheTtlSeconds = options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  const now = options.now ?? (() => Date.now());

  return {
    configUrl: options.configUrl ?? DEFAULT_CONFIG_URL,
    cache: options.cache,
    cacheTtlSeconds,
    fetchImpl,
    fetchInit: options.fetchInit,
    waitUntil: options.waitUntil,
    now
  };
}

async function loadConfig(runtime: ResolvedRuntime): Promise<RedirectsConfig | null> {
  const { configUrl, cache, cacheTtlSeconds, fetchImpl, fetchInit, now, waitUntil } = runtime;

  const memo = memoryCache.get(configUrl);
  if (memo && memo.expiresAt > now()) {
    const parsed = safeParseJson<RedirectsConfig>(memo.text, "memory parse");
    if (parsed) {
      return parsed;
    }
  }

  if (cache) {
    try {
      const cacheRequest = new Request(configUrl);
      const cached = await cache.match(cacheRequest);
      if (cached) {
        const text = await cached.text();
        const parsed = safeParseJson<RedirectsConfig>(text, "cached parse");
        if (parsed) {
          memoryCache.set(configUrl, { text, expiresAt: now() + cacheTtlSeconds * 1000 });
          return parsed;
        }
      }
    } catch (error) {
      console.error("cache match err", error);
    }
  }

  try {
    const response = await fetchImpl(configUrl, fetchInit);
    if (response && response.ok) {
      const text = await response.text();
      const parsed = safeParseJson<RedirectsConfig>(text, "config parse");
      if (parsed) {
        memoryCache.set(configUrl, { text, expiresAt: now() + cacheTtlSeconds * 1000 });
        if (cache) {
          const cacheResponse = new Response(text, {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${cacheTtlSeconds}, s-maxage=${cacheTtlSeconds}`
            }
          });

          const cacheRequest = new Request(configUrl);
          const putPromise = cache.put(cacheRequest, cacheResponse);
          if (waitUntil) {
            waitUntil(putPromise.catch((error) => console.error("cache put err", error)));
          } else {
            await putPromise;
          }
        }
        return parsed;
      }
    } else {
      console.error("failed fetch config", response ? response.status : "no response");
    }
  } catch (error) {
    console.error("load config err", error);
  }

  const fallback = memoryCache.get(configUrl);
  if (fallback) {
    const parsed = safeParseJson<RedirectsConfig>(fallback.text, "memory fallback");
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function normalisePath(pathname: string): string {
  let normalised = pathname.replace(/\/{2,}/g, "/");
  if (normalised.length > 1 && normalised.endsWith("/")) {
    normalised = normalised.slice(0, -1);
  }
  return normalised || "/";
}

function needsHttpsRedirect(url: URL): boolean {
  return url.protocol !== "https:" || url.hostname.startsWith("www.");
}

function serveFavicon(): Response {
  if (!base64Icon) {
    return new Response(null, { status: 204 });
  }

  try {
    const cleanBase64 = base64Icon.includes(",") ? base64Icon.split(",")[1] : base64Icon;
    const binaryString = atob(cleanBase64.trim());
    const length = binaryString.length;
    const bytes = new Uint8Array(length);

    for (let index = 0; index < length; index += 1) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    return new Response(bytes.buffer, {
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Icon Error: ${message}`, { status: 500 });
  }
}

function getSlotSource(config: RedirectsConfig | null): SlotBranch | null {
  if (!config) {
    return null;
  }

  const slotCandidate = config.Slots ?? config.slots ?? config.SLOT;
  return isRecord(slotCandidate) ? slotCandidate : null;
}

function flattenSlots(source: SlotBranch, out: Record<string, RouteValueEntry>): void {
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

function buildCompiledList(rulesIn: Record<string, RouteValueEntry>): CompiledEntry[] {
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

function toRouteArray(entry: RouteValueEntry): RouteValue[] {
  return Array.isArray(entry) ? entry : [entry];
}

function coerceRouteValues(input: unknown): RouteValue[] {
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

function compilePattern(pattern: string): Pick<CompiledEntry, "regex" | "names" | "isParam"> {
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

function applyTemplate(target: string, match: RegExpMatchArray, names: string[]): string {
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

function appendOriginalQuery(target: string, search: string): string {
  if (!search) {
    return target;
  }

  return target.includes("?") ? target : `${target}${search}`;
}

function resolvePrefixTarget(pathname: string, search: string, rule: NormalizedRule, base: string): string | null {
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

function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

async function respondUsingRule(request: Request, rule: NormalizedRule, targetUrl: string, runtime: ResolvedRuntime): Promise<Response> {
  if (rule.type === "proxy") {
    return proxyRequest(request, targetUrl, runtime);
  }

  return redirectResponse(targetUrl, rule.status);
}

async function proxyRequest(request: Request, targetUrl: string, runtime: ResolvedRuntime): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", "https");

  const forwarded = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual"
  });

  const response = await runtime.fetchImpl(forwarded);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-security-policy");
  responseHeaders.delete("content-security-policy-report-only");
  responseHeaders.delete("x-frame-options");
  responseHeaders.set("Strict-Transport-Security", HSTS_HEADER_VALUE);

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}

function redirectResponse(location: string, status: number): Response {
  return new Response(null, {
    status: status || DEFAULT_STATUS,
    headers: {
      Location: location,
      "Strict-Transport-Security": HSTS_HEADER_VALUE
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeParseJson<T>(text: string, label: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(label, error);
    return null;
  }
}

export type { RedirectsConfig, RouteConfig };
