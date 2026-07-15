import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../init";
import { dealerPortalRouter } from "./dealer-portal.route";
import { google } from "./google-place.route";

export const dealershipAppRouter = createTRPCRouter({
	dealerPortal: dealerPortalRouter,
	google,
});

export type AppRouter = typeof dealershipAppRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
