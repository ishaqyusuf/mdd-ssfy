import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../init";
import { storefrontAuthRouter } from "./storefront-auth.route";
import { storefrontPublicRouter } from "./storefront-public.route";

export const storefrontAppRouter = createTRPCRouter({
	storefrontCommerce: storefrontPublicRouter,
	storefrontAuth: storefrontAuthRouter,
});

export type StorefrontAppRouter = typeof storefrontAppRouter;
export type StorefrontRouterInputs = inferRouterInputs<StorefrontAppRouter>;
export type StorefrontRouterOutputs = inferRouterOutputs<StorefrontAppRouter>;
