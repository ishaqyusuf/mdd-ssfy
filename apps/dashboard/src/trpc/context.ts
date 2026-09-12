"use client";

import type { AppRouter } from "@gnd/api/trpc/routers/_app";
import { createTRPCContext } from "@gnd/ui/tanstack";

export const { TRPCProvider, useTRPC, useTRPCClient } =
	createTRPCContext<AppRouter>();
