import { createDenoHandler } from "../src/platforms/deno.ts";

const denoGlobal = globalThis as {
	Deno?: { serve?: (handler: (request: Request) => Response | Promise<Response>) => void };
};

const serve = denoGlobal.Deno?.serve;

if (!serve) {
	throw new Error("Deno.serve is not available in this environment");
}

serve(createDenoHandler());
