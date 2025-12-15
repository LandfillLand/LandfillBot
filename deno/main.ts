import { handler } from "@/platforms/deno";

type DenoLike = {
	serve?: (handler: (request: Request) => Response | Promise<Response>) => unknown;
};

const denoGlobal = globalThis as { Deno?: DenoLike };
const serve = denoGlobal.Deno?.serve;

if (!serve) {
	throw new Error("Deno.serve is not available in this environment");
}

serve(handler);
