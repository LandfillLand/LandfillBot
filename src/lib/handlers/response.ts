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

import { DEFAULT_STATUS, HSTS_HEADER_VALUE, HTTPS_REDIRECT_STATUS } from "./constants";
import { NormalizedRule, ResolvedRuntime } from "./types";

export function needsHttpsRedirect(url: URL): boolean {
  return url.protocol !== "https:" || url.hostname.startsWith("www.");
}

export async function respondUsingRule(request: Request, rule: NormalizedRule, targetUrl: string, runtime: ResolvedRuntime): Promise<Response> {
  if (rule.type === "proxy") {
    return proxyRequest(request, targetUrl, runtime);
  }

  return redirectResponse(targetUrl, rule.status);
}

export async function proxyRequest(request: Request, targetUrl: string, runtime: ResolvedRuntime): Promise<Response> {
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

export function redirectResponse(location: string, status: number): Response {
  return new Response(null, {
    status: status || DEFAULT_STATUS,
    headers: {
      Location: location,
      "Strict-Transport-Security": HSTS_HEADER_VALUE
    }
  });
}
