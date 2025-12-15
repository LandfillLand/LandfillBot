import type { ExecutionContext } from "@cloudflare/workers-types";
import { handleRedirectRequest, resolveConfigUrlFromBindings, type HandlerOptions } from "@/lib/handler.ts";

declare const caches: CacheStorage & { default: Cache };

const baseOptions: HandlerOptions = {
  cache: caches.default,
  cacheTtlSeconds: 3600,
  fetchInit: { cf: { cacheTtl: 3600, cacheEverything: true } }
};

const worker = {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const waitUntil = ctx && typeof ctx.waitUntil === "function" ? (promise: Promise<unknown>) => ctx.waitUntil(promise) : undefined;
    const configUrl = resolveConfigUrlFromBindings(env && typeof env === "object" ? (env as Record<string, unknown>) : undefined);
    const options: HandlerOptions = { ...baseOptions, waitUntil };
    if (configUrl) {
      options.configUrl = configUrl;
    }
    return handleRedirectRequest(request, options);
  }
};

export default worker;
