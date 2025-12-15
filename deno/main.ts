// @ts-expect-error -- Deno requires explicit .ts extension; allowed only in this entrypoint.
import { handler } from "../src/platforms/deno.ts";

type DenoLike = {
	serve?: (handler: (request: Request) => Response | Promise<Response>) => unknown;
};

const denoGlobal = globalThis as { Deno?: DenoLike };
const serve = denoGlobal.Deno?.serve;

if (!serve) {
	throw new Error("Deno.serve is not available in this environment");
}

serve(handler);
