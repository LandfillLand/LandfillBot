import { handleRedirectRequest, resolveConfigUrlFromBindings, type HandlerOptions } from "../lib/handler.ts";

export function createDenoHandler(options?: HandlerOptions) {
  return async (request: Request): Promise<Response> => {
    const bindings = Deno.env.toObject();
    const configUrl = options?.configUrl ?? resolveConfigUrlFromBindings(bindings);
    const baseOptions = configUrl && configUrl !== options?.configUrl 
      ? { ...options, configUrl } 
      : options;
    return handleRedirectRequest(request, baseOptions);
  };
}

export const handler = createDenoHandler();
export type { HandlerOptions };
