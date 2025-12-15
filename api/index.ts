import { createVercelRouteHandler } from "@/platforms/vercel-edge";

export const config = { runtime: "edge" };

const handler = createVercelRouteHandler();

export default handler;
