import { createVercelRouteHandler } from "../src/platforms/vercel-edge";

export const config = { runtime: "edge" };

const handler = createVercelRouteHandler();

export default handler;
