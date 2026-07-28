"use client";

import type { useTRPC } from "@/trpc/client";
import type { useQueryClient } from "@gnd/ui/tanstack";

export let _trpc: ReturnType<typeof useTRPC> | undefined;
export let _qc: ReturnType<typeof useQueryClient> | undefined;
