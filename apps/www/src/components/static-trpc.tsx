"use client";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

export let _trpc: ReturnType<typeof useTRPC> | undefined;
export let _qc: ReturnType<typeof useQueryClient> | undefined;

export function StaticTrpc() {
    _trpc = useTRPC();
    _qc = useQueryClient();

    return null; // nothing to render
}

type InvalidateKeys = "mutationKey" | "queryKey" | "infiniteQueryKey";
export const _invalidate = (route, key: InvalidateKeys = "queryKey") =>
    _qc.invalidateQueries({
        queryKey: route[key](),
    });

