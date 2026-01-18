/**
 * @file constants.ts
 * @description
 * [EN] Global Constants.
 * Stores system-wide constant values such as HTTP status codes, cache TTLs, and header values
 * to maintain a single source of truth and avoid magic numbers.
 *
 * [CN] 全局常量。
 * 存储系统范围的常量值，如 HTTP 状态码、缓存 TTL 和响应头值，
 * 以维护单一事实来源并避免代码中出现魔法数字。
 *
 * @see {@link https://github.com/IGCyukira/i0c.cc} for repository info.
 */

export const HTTPS_REDIRECT_STATUS = 308;
export const DEFAULT_STATUS = 302;
export const HSTS_HEADER_VALUE = "max-age=63072000; includeSubDomains";
export const DEFAULT_CACHE_TTL_SECONDS = 3600;
