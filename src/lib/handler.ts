/**
 * @file handler.ts
 * @description
 * [EN] Core Logic Entry Point.
 * This module acts as the controller that coordinates config loading,
 * route matching (regex/prefix), and response handling. It is platform-agnostic.
 *
 * [CN] 核心逻辑入口。
 * 该模块作为控制器，负责协调配置加载、路由匹配（正则/前缀）以及响应处理。
 * 它与具体部署平台（Cloudflare/Vercel）解耦，通用性强。
 *
 * @see {@link https://github.com/IGCyukira/i0c.cc} for repository info.
 */

import { loadConfig, resolveRuntimeOptions } from "@handlers/loader";
import { applyTemplate, appendOriginalQuery, buildCompiledList, flattenSlots, getSlotSource, resolvePrefixTarget } from "@handlers/matcher";
import { HandlerOptions, RouteValueEntry } from "@handlers/types";
import { serveFavicon } from "@handlers/favicon-serve";
import { HTTPS_REDIRECT_STATUS } from "@handlers/constants";
import { needsHttpsRedirect, respondUsingRule } from "@handlers/response";
import { normalisePath, safeDecode } from "@handlers/utils";
import { notFoundPageHtml } from "@handlers/templates";

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

  return new Response(notFoundPageHtml, {
    status: 404,
    headers: { 
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}

export { resolveConfigUrlFromBindings, DEFAULT_CONFIG_URL } from "@handlers/config";
export type { RedirectsConfig, RouteConfig, HandlerOptions } from "@handlers/types";
