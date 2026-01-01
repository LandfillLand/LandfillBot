/**
 * @file response.ts
 * @description
 * [EN] Response Factory.
 * Constructs the final HTTP responses for the client. Contains specific logic for handling
 * Redirects (3xx status codes) and Proxies (request forwarding), including security headers.
 *
 * [CN] 响应工厂。
 * 为客户端构造最终的 HTTP 响应。包含处理重定向（3xx 状态码）和代理（请求转发）的具体逻辑，
 * 包括设置安全响应头。
 *
 * @see {@link https://github.com/IGCyukira/i0c.cc} for repository info.
 */

import { DEFAULT_STATUS, HSTS_HEADER_VALUE } from "./constants";
import { NormalizedRule, ResolvedRuntime } from "./types";

export function needsHttpsRedirect(url: URL): boolean {
  return url.protocol !== "https:" || url.hostname.startsWith("www.");
}

export async function respondUsingRule(
  request: Request, 
  rule: NormalizedRule, 
  targetUrl: string, 
  runtime: ResolvedRuntime,
  basePath?: string
): Promise<Response> {
  if (rule.type === "proxy") {
    return proxyRequest(request, targetUrl, runtime, basePath);
  }

  return redirectResponse(targetUrl, rule.status);
}

export async function proxyRequest(
  request: Request,
  targetUrl: string,
  runtime: ResolvedRuntime,
  basePath: string = ""
): Promise<Response> {
  const originalHost = request.headers.get("host") ?? "";
  const originalUrl = new URL(request.url);
  const targetUrlObj = new URL(targetUrl);

  const MAX_REDIRECTS = 5;
  let currentTarget = targetUrl;
  let redirectCount = 0;
  let lastResponse: Response | null = null;

  let bodyBuffer: ArrayBuffer | undefined;
  const originalMethod = request.method.toUpperCase();
  if (originalMethod !== "GET" && originalMethod !== "HEAD" && request.body) {
    bodyBuffer = await request.arrayBuffer();
  }

  let effectiveMethod = originalMethod;

  while (redirectCount <= MAX_REDIRECTS) {
    const headers = new Headers(request.headers);
    const currentUrlObj = new URL(currentTarget);

    headers.delete("host");
    headers.set("x-forwarded-host", request.headers.get("host") ?? "");
    headers.set("x-forwarded-proto", "https");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");

    headers.set("origin", currentUrlObj.origin);
    headers.set("referer", currentTarget);

    let forwardBody: BodyInit | null = null;
    if (effectiveMethod !== "GET" && effectiveMethod !== "HEAD" && bodyBuffer) {
      forwardBody = bodyBuffer;
    }

    const forwarded = new Request(currentTarget, {
      method: effectiveMethod,
      headers,
      body: forwardBody,
      redirect: "manual"
    });

    try {
      lastResponse = await runtime.fetchImpl(forwarded);
    } catch (e) {
      console.error(`Proxy fetch failed for ${currentTarget}:`, e);
      return new Response("Bad Gateway: Upstream fetch failed.", { status: 502 });
    }

    const status = lastResponse.status;
    if (status >= 300 && status < 400) {
      const location = lastResponse.headers.get("Location");
      if (!location) break;

      const nextUrl = new URL(location, currentUrlObj).toString();

      if (status === 301 || status === 302 || status === 303) {
        effectiveMethod = "GET";
      }

      currentTarget = nextUrl;
      redirectCount += 1;
      continue;
    }

    break;
  }

  if (!lastResponse) {
    return new Response("Gateway Timeout", { status: 504 });
  }

  const responseHeaders = new Headers(lastResponse.headers);

  responseHeaders.set("x-upstream-status", String(lastResponse.status));
  responseHeaders.set("x-upstream-location", lastResponse.headers.get("Location") ?? "");
  responseHeaders.set("x-proxy-redirects-followed", String(redirectCount));

  responseHeaders.delete("content-security-policy");
  responseHeaders.delete("content-security-policy-report-only");
  responseHeaders.delete("x-frame-options");
  responseHeaders.set("Strict-Transport-Security", HSTS_HEADER_VALUE);

  const setCookie = responseHeaders.get("set-cookie");
  if (setCookie) {
    const fixedCookie = setCookie.replace(/;\s*domain=[^;]+/ig, "");
    responseHeaders.set("set-cookie", fixedCookie);
  }

  const location = responseHeaders.get("Location");
  if (location) {
    let finalLocation = location;

    try {
      const locUrl = new URL(location, currentTarget);
      if (locUrl.origin === targetUrlObj.origin && originalHost) {
        const rewritten = `https://${originalHost}${locUrl.pathname}${locUrl.search}`;
        finalLocation = rewritten !== originalUrl.href ? rewritten : locUrl.toString();
      } else {
        finalLocation = locUrl.toString();
      }
    } catch {
    }

    if (basePath && basePath !== "/" && finalLocation.startsWith("/") && !finalLocation.startsWith("//")) {
      finalLocation = `${basePath}${finalLocation}`;
    }

    responseHeaders.set("Location", finalLocation);
  }

  const contentType = responseHeaders.get("content-type") || "";
  const shouldRewriteHtml = basePath && basePath !== "/" && contentType.includes("text/html");

  if (!shouldRewriteHtml) {
    return new Response(lastResponse.body, {
      status: lastResponse.status,
      headers: responseHeaders
    });
  }

  const html = await lastResponse.text();
  const prefix = basePath || "";
  const rewrittenHtml = html.replace(/(href|src|action)="\/((?!\/|#|\.\/|\.\.\/)[^"]*)"/g, (_, attr, pathPart) => {
    return `${attr}="${prefix}/${pathPart}"`;
  }).replace(/<base\s+href="\/"\s*>/gi, `<base href="${prefix}/">`);

  responseHeaders.delete("content-length");

  return new Response(rewrittenHtml, {
    status: lastResponse.status,
    headers: responseHeaders
  });
}

export function redirectResponse(location: string, status: number): Response {
  return new Response(null, {
    status: status || DEFAULT_STATUS,
    headers: {
      Location: location,
      "Strict-Transport-Security": HSTS_HEADER_VALUE
    }
  });
}