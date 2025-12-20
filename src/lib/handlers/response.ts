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
