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
import { generateRobots, generateSitemapXml, isRobotsAllowed } from "@handlers/seo";
import { HandlerOptions, RouteValueEntry } from "@handlers/types";
import { serveFavicon } from "@handlers/favicon-serve";
import { HTTPS_REDIRECT_STATUS } from "@handlers/constants";
import { needsHttpsRedirect, respondUsingRule } from "@handlers/response";
import { normalisePath, safeDecode } from "@handlers/utils";
import { notFoundPageHtml } from "@handlers/templates";

export async function handleRedirectRequest(request: Request, options: HandlerOptions = {}): Promise<Response> {
  const runtime = resolveRuntimeOptions(options);

  try {
    const url = new URL(request.url);
    const path = normalisePath(url.pathname);

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
      console.warn("[Handler] No slots configured.");
      return new Response("503 No Slots configured", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (path === "/robots.txt" || path === "/sitemap.xml") {
      const rawRules: Record<string, RouteValueEntry> = {};
      flattenSlots(slotSource, rawRules);
      const origin = url.origin;

      if (path === "/robots.txt") {
        const robots = generateRobots(origin, runtime.envBindings);
        return new Response(robots, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" }
        });
      }

      if (!isRobotsAllowed(runtime.envBindings)) {
        return new Response("Sitemap disabled", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" }
        });
      }

      const sitemap = generateSitemapXml(origin, rawRules);
      return new Response(sitemap, {
        status: 200,
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }
      });
    }

    const rawRules: Record<string, RouteValueEntry> = {};
    flattenSlots(slotSource, rawRules);
    
    const compiledList = buildCompiledList(rawRules);
    const decodedPath = safeDecode(path);
    const tasks: Promise<Response>[] = [];

    for (const item of compiledList) {
      const { rule, regex, names, isParam, base } = item;
      
      if (!rule.target) continue;

      let targetUrl: string | null = null;
      const match = decodedPath.match(regex);

      if (match) {
        const resolved = applyTemplate(rule.target, match, names);
        targetUrl = appendOriginalQuery(resolved, url.search);
      } else if (rule.type === "prefix" && !isParam) {
        targetUrl = resolvePrefixTarget(decodedPath, url.search, rule, base);
      }

      if (targetUrl) {
        const reqClone = request.clone() as Request;
        const task = async () => {
          const response = await respondUsingRule(reqClone, rule, targetUrl!, runtime, base);

          if (rule.type === "proxy") {
            if (response.status === 404) {
              throw new Error(`[Proxy] 404 Not Found from ${targetUrl}`);
            }
            if (response.status >= 500) {
              throw new Error(`[Proxy] Upstream Error ${response.status} from ${targetUrl}`);
            }
          }
          
          return response;
        };

        tasks.push(task());
      }
    }

    if (tasks.length === 0) {
      return new Response(notFoundPageHtml, {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        }
      });
    }

    try {
      return await Promise.any(tasks);
    } catch (aggregateError) {
      return new Response(notFoundPageHtml, {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        }
      });
    }

  } catch (error) {
    console.error("[Handler Critical Error]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export { resolveConfigUrlFromBindings, DEFAULT_CONFIG_URL } from "@handlers/config";
export type { RedirectsConfig, RouteConfig, HandlerOptions } from "@handlers/types";
