/**
 * @file loader.ts
 * @description
 * [EN] Config Loader & Cache.
 * Handles fetching the remote configuration JSON via HTTP and managing in-memory caching
 * strategies to optimize performance and reduce latency.
 *
 * [CN] 配置加载器与缓存。
 * 处理通过 HTTP 获取远程配置 JSON 的请求，并管理内存缓存策略，
 * 以优化性能并降低延迟。
 *
 * @see {@link https://github.com/IGCyukira/i0c.cc} for repository info.
 */

import { DEFAULT_CONFIG_URL } from "./config";
import { safeParseJson } from "./utils";
import { DEFAULT_CACHE_TTL_SECONDS } from "./constants";
import { HandlerOptions, MemoryCacheEntry, RedirectsConfig, ResolvedRuntime } from "./types";

const memoryCache = new Map<string, MemoryCacheEntry>();

export function resolveRuntimeOptions(options: HandlerOptions): ResolvedRuntime {
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

export async function loadConfig(runtime: ResolvedRuntime): Promise<RedirectsConfig | null> {
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
