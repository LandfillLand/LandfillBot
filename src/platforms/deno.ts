import { handleRedirectRequest, resolveConfigUrlFromBindings, type HandlerOptions } from "@/lib/handler.ts";

type DenoLike = {
  serve?: (handler: (request: Request) => Response | Promise<Response>) => unknown;
};

declare global {
  interface ImportMeta {
    readonly main?: boolean;
  }
}

function getServe() {
  const denoGlobal = globalThis as { Deno?: DenoLike };
  const serve = denoGlobal.Deno?.serve;
  if (!serve) {
    throw new Error("Deno.serve is not available in this environment");
  }
  return serve;
}

export function createDenoHandler(options?: HandlerOptions) {
  const configUrl = options?.configUrl ?? resolveConfigUrlFromBindings();
  const baseOptions = configUrl && configUrl !== options?.configUrl ? { ...options, configUrl } : options;

  return (request: Request): Promise<Response> => handleRedirectRequest(request, baseOptions);
}

export function serveDeno(options?: HandlerOptions) {
  const serve = getServe();
  return serve(createDenoHandler(options));
}

export type { HandlerOptions };

if (import.meta.main) {
  serveDeno();
}
