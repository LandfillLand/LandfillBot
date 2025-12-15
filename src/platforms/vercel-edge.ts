import { handleRedirectRequest, resolveConfigUrlFromBindings, type HandlerOptions } from "@/lib/handler.ts";

declare const process: undefined | { env?: Record<string, string | undefined> };

function getProcessEnv(): Record<string, unknown> | undefined {
  if (typeof process !== "undefined" && process?.env) {
    return process.env as Record<string, unknown>;
  }
  return undefined;
}

export const runtime = "edge";

export function createVercelRouteHandler(options?: HandlerOptions) {
  return async function vercelRoute(request: Request): Promise<Response> {
    const bindings = getProcessEnv();
    const resolvedUrl = options?.configUrl ?? resolveConfigUrlFromBindings(bindings);
    const finalOptions = resolvedUrl && resolvedUrl !== options?.configUrl ? { ...options, configUrl: resolvedUrl } : options;
    return handleRedirectRequest(request, finalOptions);
  };
}

const defaultHandler = createVercelRouteHandler();

export const config = { runtime };

export default defaultHandler;

export const GET = defaultHandler;
export const HEAD = defaultHandler;
export const OPTIONS = defaultHandler;
export const POST = defaultHandler;
export const PUT = defaultHandler;
export const PATCH = defaultHandler;
export const DELETE = defaultHandler;

export type { HandlerOptions };
