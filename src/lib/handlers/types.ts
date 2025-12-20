/**
 * @file types.ts
 * @description
 * [EN] Type Definitions.
 * Defines all TypeScript interfaces, types, and shared data structures used throughout the library.
 * Centralizing types here prevents circular dependencies.
 *
 * [CN] 类型定义。
 * 定义库中使用的所有 TypeScript 接口、类型和共享数据结构。
 *在此处集中管理类型可防止循环依赖。
 *
 * @see {@link https://github.com/IGCyukira/i0c.cc} for repository info.
 */

export type RouteType = "prefix" | "exact" | "proxy";

export type RouteValue = string | RouteConfig;
export type RouteValueEntry = RouteValue | RouteValue[];

export interface RouteConfig {
  type?: string;
  target?: string;
  to?: string;
  url?: string;
  appendPath?: boolean;
  status?: number;
  priority?: number;
}

export interface NormalizedRule {
  type: RouteType;
  target: string;
  appendPath: boolean;
  status: number;
  priority: number;
}

export interface CompiledEntry {
  base: string;
  rule: NormalizedRule;
  regex: RegExp;
  names: string[];
  isParam: boolean;
  order: number;
}

export type SlotBranch = Record<string, unknown>;

export interface RedirectsConfig {
  Slots?: SlotBranch;
  slots?: SlotBranch;
  SLOT?: SlotBranch;
  [key: string]: unknown;
}

export interface MemoryCacheEntry {
  text: string;
  expiresAt: number;
}

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

export interface ResolvedRuntime {
  configUrl: string;
  cache?: CacheLike;
  cacheTtlSeconds: number;
  fetchImpl: typeof fetch;
  fetchInit?: RequestInit;
  waitUntil?: (promise: Promise<unknown>) => void;
  now: () => number;
}
