"use client";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";
import { usePathname } from "next/navigation";

export let _trpc: ReturnType<typeof useTRPC> | undefined;
export let _qc: ReturnType<typeof useQueryClient> | undefined;
export let _path: ReturnType<typeof usePathname> | undefined;

export function StaticTrpc() {
    _trpc = useTRPC();
    _qc = useQueryClient();
    _path = usePathname();
    return null; // nothing to render
}

type InvalidateKeys = "mutationKey" | "queryKey" | "infiniteQueryKey";
export const _invalidate = (route, key: InvalidateKeys = "queryKey") =>
    _qc.invalidateQueries({
        queryKey: route[key](),
    });
export const _pathIs = (path: string) =>
    _path === `/${path.split("/").filter(Boolean).join("/")}`;

