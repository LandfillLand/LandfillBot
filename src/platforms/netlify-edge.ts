import { handleRedirectRequest, resolveConfigUrlFromBindings, type HandlerOptions } from "@/lib/handler";

type NetlifyContext = {
  env?: Record<string, string | undefined>;
};

type NetlifyHandler = (request: Request, context: NetlifyContext) => Promise<Response> | Response;

export function createNetlifyEdgeHandler(options?: HandlerOptions): NetlifyHandler {
  return async function netlifyEdgeHandler(request: Request, context: NetlifyContext): Promise<Response> {
    const bindings = context?.env;
    const resolvedUrl = options?.configUrl ?? resolveConfigUrlFromBindings(bindings);
    const finalOptions = resolvedUrl && resolvedUrl !== options?.configUrl ? { ...options, configUrl: resolvedUrl } : options;
    return handleRedirectRequest(request, finalOptions);
  };
}

const defaultHandler = createNetlifyEdgeHandler();

export const config = { path: "/*" };

export default defaultHandler;

export type { HandlerOptions };
