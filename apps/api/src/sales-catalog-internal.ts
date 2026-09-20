import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { createTRPCContext } from "./trpc/init";
import { salesCatalogRouter } from "./trpc/routers/sales-catalog.route";

const app = new Hono();
app.use(
	"/api/sales-catalog/*",
	trpcServer({
		router: salesCatalogRouter,
		createContext: createTRPCContext,
		endpoint: "/api/sales-catalog",
	}),
);

const handler = handle(app);
export const GET = handler;
export const POST = handler;
