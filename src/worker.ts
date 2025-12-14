import { base64Icon } from "./favicon";

declare const caches: CacheStorage & { default: Cache };

const CONFIG_REPO = "IGCyukira/i0c.cc";
const CONFIG_BRANCH = "data";
const CONFIG_PATH = "redirects.json";
const CONFIG_URL = `https://raw.githubusercontent.com/${CONFIG_REPO}/${CONFIG_BRANCH}/${CONFIG_PATH}`;

type RouteType = "prefix" | "exact" | "proxy";

type RouteValue = string | RouteConfig;

interface RouteConfig {
  type?: string;
  target?: string;
  to?: string;
  url?: string;
  appendPath?: boolean;
  status?: number;
}

interface NormalizedRule {
  type: RouteType;
  target: string;
  appendPath: boolean;
  status: number;
}

interface CompiledEntry {
  base: string;
  rule: NormalizedRule;
  regex: RegExp;
  names: string[];
  isParam: boolean;
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

const worker = {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let path = normalisePath(url.pathname || "/");

    if (needsHttpsRedirect(url)) {
      const hostname = url.hostname.startsWith("www.") ? url.hostname.replace(/^www\./, "") : url.hostname;
      const destination = `https://${hostname}${url.pathname}${url.search}`;
      return Response.redirect(destination, HTTPS_REDIRECT_STATUS);
    }

    if (path === "/favicon.ico") {
      return serveFavicon();
    }

    const redirectsConfig = await loadConfig(CONFIG_URL);
    const slotSource = getSlotSource(redirectsConfig);
    if (!slotSource) {
      return new Response("503 No Slots configured", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const rawRules: Record<string, RouteValue> = {};
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
        return respondUsingRule(request, rule, finalUrl);
      }

      if (rule.type === "prefix" && !isParam) {
        const redirectTarget = resolvePrefixTarget(decodedPath, url.search, rule, base);
        if (redirectTarget) {
          return respondUsingRule(request, rule, redirectTarget);
        }
      }
    }

    return new Response("404 Not Found - 链接不存在", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};

export default worker;

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

async function loadConfig(configUrl: string): Promise<RedirectsConfig | null> {
  const cache = caches.default;
  const cacheKey = new Request(configUrl);
  let config: RedirectsConfig | null = null;

  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const text = await cached.text();
      config = safeParseJson<RedirectsConfig>(text, "cached parse");
    }

    if (!config) {
      const response = await fetch(configUrl, { cf: { cacheTtl: 3600, cacheEverything: true } });
      if (response && response.ok) {
        const text = await response.text();
        const parsed = safeParseJson<RedirectsConfig>(text, "config parse");
        if (parsed) {
          config = parsed;
          await cache.put(cacheKey, new Response(text, {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=3600, s-maxage=3600"
            }
          }));
        }
      } else {
        console.error("failed fetch config", response ? response.status : "no response");
      }
    }
  } catch (error) {
    console.error("load config err", error);
  }

  return config;
}

function getSlotSource(config: RedirectsConfig | null): SlotBranch | null {
  if (!config) {
    return null;
  }

  const slotCandidate = config.Slots ?? config.slots ?? config.SLOT;
  return isRecord(slotCandidate) ? slotCandidate : null;
}

function flattenSlots(source: SlotBranch, out: Record<string, RouteValue>): void {
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith("/")) {
      out[key] = value as RouteValue;
    } else if (isRecord(value)) {
      flattenSlots(value, out);
    }
  }
}

function buildCompiledList(rulesIn: Record<string, RouteValue>): CompiledEntry[] {
  const list: CompiledEntry[] = [];

  for (const [rawKey, rawValue] of Object.entries(rulesIn)) {
    let base = rawKey.startsWith("/") ? rawKey : `/${rawKey}`;
    if (base.length > 1 && base.endsWith("/")) {
      base = base.slice(0, -1);
    }

    const rule = normaliseRule(rawValue);
    if (!rule) {
      continue;
    }

    const compiled = compilePattern(base);
    list.push({ base, rule, ...compiled });
  }

  list.sort((a, b) => b.base.length - a.base.length);
  return list;
}

function normaliseRule(value: RouteValue): NormalizedRule | null {
  if (typeof value === "string") {
    return { type: "prefix", target: value, appendPath: true, status: DEFAULT_STATUS };
  }

  if (value && typeof value === "object") {
    const type: RouteType = value.type === "exact" ? "exact" : value.type === "proxy" ? "proxy" : "prefix";
    const target = value.target ?? value.to ?? value.url ?? "";
    const appendPath = value.appendPath !== undefined ? Boolean(value.appendPath) : true;
    const parsedStatus = Number(value.status);
    const status = Number.isFinite(parsedStatus) ? parsedStatus : DEFAULT_STATUS;

    return { type, target, appendPath, status };
  }

  return null;
}

function compilePattern(pattern: string): Omit<CompiledEntry, "base" | "rule"> {
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

async function respondUsingRule(request: Request, rule: NormalizedRule, targetUrl: string): Promise<Response> {
  if (rule.type === "proxy") {
    return proxyRequest(request, targetUrl);
  }

  return redirectResponse(targetUrl, rule.status);
}

async function proxyRequest(request: Request, targetUrl: string): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", "https");

  const forwarded = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual"
  });

  const response = await fetch(forwarded);
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
