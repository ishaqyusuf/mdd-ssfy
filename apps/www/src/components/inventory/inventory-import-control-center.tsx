"use client";

import ConfirmBtn from "@/components/confirm-button";
import { DataTable } from "@/components/tables/inventory-import/data-table";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useCallback, useEffect, useMemo, useState } from "react";

type Strategy = "optimized" | "handcrafted";
type ScopeMode = "active" | "all";

function StatCard({
    title,
    value,
    subtitle,
}: {
    title: string;
    value: string | number;
    subtitle: string;
}) {
    return (
        <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {title}
            </div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
        </Card>
    );
}

function CheckRow({
    label,
    ok,
    detail,
}: {
    label: string;
    ok: boolean;
    detail: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{detail}</div>
            </div>
            <Badge
                variant={ok ? "secondary" : "destructive"}
                className="shrink-0 gap-1"
            >
                {ok ? (
                    <Icons.CheckCircle className="size-3.5" />
                ) : (
                    <Icons.Clock className="size-3.5" />
                )}
                {ok ? "Healthy" : "Needs Attention"}
            </Badge>
        </div>
    );
}

export function InventoryImportControlCenter() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [strategy, setStrategy] = useState<Strategy>("optimized");
    const [scope, setScope] = useState<ScopeMode>("active");
    const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);
    const [currentRunId, setCurrentRunId] = useState<string | null>(null);
    const [currentRunLabel, setCurrentRunLabel] = useState<string | null>(null);

    const imports = useQuery(
        trpc.inventories.inventoryImports.queryOptions({
            size: 200,
            scope,
        }),
    );
    const totalProducts = useQuery(
        trpc.inventories.inventorySummary.queryOptions({
            type: "total_products",
        }),
    );
    const categories = useQuery(
        trpc.inventories.inventorySummary.queryOptions({
            type: "categories",
        }),
    );
    const kindReview = useQuery(
        trpc.inventories.inventoryProductKindReview.queryOptions(),
    );
    const runStatus = useQuery({
        ...trpc.taskTrigger.status.queryOptions({
            runId: currentRunId || "pending",
        }),
        enabled: !!currentRunId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status &&
                ["COMPLETED", "FAILED", "CANCELED", "CANCELLED"].includes(
                    status,
                )
                ? false
                : 1500;
        },
    });

    const rows = imports.data?.data || [];
    const scopeMeta = imports.data?.meta;
    const importedCount = rows.filter((row) => Boolean(row.categoryUid)).length;
    const pendingCount = rows.filter((row) => !row.categoryUid).length;
    const totalScopedProducts = rows.reduce(
        (sum, row) => sum + Number(row.totalProducts || 0),
        0,
    );

    const invalidateAll = useCallback(async () => {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: trpc.inventories.inventoryImports.queryKey(),
            }),
            queryClient.invalidateQueries({
                queryKey: trpc.inventories.inventoryProducts.infiniteQueryKey(),
            }),
            queryClient.invalidateQueries({
                queryKey: trpc.inventories.inventorySummary.queryKey(),
            }),
            queryClient.invalidateQueries({
                queryKey:
                    trpc.inventories.inventoryProductKindReview.queryKey(),
            }),
        ]);
    }, [queryClient, trpc]);

    const runFullImport = useMutation(
        trpc.inventories.runFullImport.mutationOptions({
            onSuccess: async (data, variables) => {
                setCurrentRunId(data.id);
                setCurrentRunLabel(
                    variables.compare
                        ? "System Check"
                        : variables.reset
                          ? "Full Refresh"
                          : "Update Inventory",
                );
                setLastRunSummary(
                    `${variables.compare ? "System check" : variables.reset ? "Full refresh" : "Inventory update"} queued for ${variables.scope} scope using ${variables.strategy}.`,
                );
                toast({
                    title: variables.compare
                        ? "System check queued"
                        : variables.reset
                          ? "Full refresh queued"
                          : "Inventory update queued",
                    variant: "success",
                });
            },
            onError: () => {
                toast({
                    title: "Import action failed",
                    variant: "destructive",
                });
            },
        }),
    );

    const isImportRunning =
        runFullImport.isPending ||
        runStatus.data?.isQueued ||
        runStatus.data?.isExecuting ||
        false;

    useEffect(() => {
        if (!currentRunId || !runStatus.data) return;

        if (runStatus.data.isCompleted) {
            const output = runStatus.data.output as {
                totalSteps?: number;
                strategy?: string;
                compare?: boolean;
                reset?: boolean;
            } | null;
            const summary =
                output && typeof output === "object"
                    ? `${output.totalSteps || 0} steps processed using ${output.strategy || strategy}${output.compare ? " (compare)" : ""}${output.reset ? " with reset" : ""}.`
                    : `${currentRunLabel || "Inventory import"} completed.`;

            setLastRunSummary(summary);
            toast({
                title: `${currentRunLabel || "Inventory import"} completed`,
                variant: "success",
            });
            void invalidateAll();
            setCurrentRunId(null);
            setCurrentRunLabel(null);
            return;
        }

        if (runStatus.data.isFailed || runStatus.data.isCancelled) {
            setLastRunSummary(
                `${currentRunLabel || "Inventory import"} failed. Review the latest job run for details.`,
            );
            toast({
                title: `${currentRunLabel || "Inventory import"} failed`,
                variant: "destructive",
            });
            setCurrentRunId(null);
            setCurrentRunLabel(null);
        }
    }, [
        currentRunId,
        currentRunLabel,
        invalidateAll,
        runStatus.data,
        strategy,
    ]);

    const resetInventory = useMutation(
        trpc.inventories.resetInventorySystem.mutationOptions({
            onSuccess: async () => {
                setLastRunSummary("Inventory system reset completed.");
                toast({
                    title: "Inventory system reset",
                    variant: "success",
                });
                await invalidateAll();
            },
            onError: () => {
                toast({
                    title: "Reset failed",
                    variant: "destructive",
                });
            },
        }),
    );

    const checks = useMemo(
        () => [
            {
                label: "Legacy import coverage",
                ok: pendingCount === 0,
                detail:
                    pendingCount === 0
                        ? "Every active sales-settings step in scope has an imported inventory category."
                        : `${pendingCount} active-scope steps are still pending import coverage.`,
            },
            {
                label: "Stale imported categories",
                ok: (scopeMeta?.staleImportedCategories || 0) === 0,
                detail:
                    (scopeMeta?.staleImportedCategories || 0) === 0
                        ? "No excluded Dyke steps are still represented in imported inventory categories."
                        : `${scopeMeta?.staleImportedCategories || 0} imported categories belong to steps outside the active sales-settings scope.`,
            },
            {
                label: "Kind classification review",
                ok: (kindReview.data?.mismatched || 0) === 0,
                detail:
                    (kindReview.data?.mismatched || 0) === 0
                        ? "Current inventory/component kinds match the pricing heuristic."
                        : `${kindReview.data?.mismatched || 0} records still differ from the suggested kind.`,
            },
            {
                label: "Import strategy",
                ok: strategy === "optimized",
                detail:
                    strategy === "optimized"
                        ? "Optimized strategy is selected as the default update path."
                        : "Handcrafted strategy is selected for this run. Use only when validating edge cases.",
            },
        ],
        [
            kindReview.data?.mismatched,
            pendingCount,
            scopeMeta?.staleImportedCategories,
            strategy,
        ],
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Import Control Center</h2>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    This workspace is now settings-driven. Update, check, reset,
                    and monitor the inventory import from the steps actively
                    used by the sales form instead of pulling the full legacy
                    Dyke set.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Scoped Steps"
                    value={rows.length}
                    subtitle={`${importedCount} imported • ${pendingCount} pending • ${scopeMeta?.excludedSteps || 0} excluded`}
                />
                <StatCard
                    title="Scoped Products"
                    value={totalScopedProducts}
                    subtitle="Total Dyke products visible inside the selected import scope"
                />
                <StatCard
                    title="Inventory Records"
                    value={totalProducts.data?.value || 0}
                    subtitle={String(
                        totalProducts.data?.subtitle ||
                            "Current inventory count",
                    )}
                />
                <StatCard
                    title="Categories"
                    value={categories.data?.value || 0}
                    subtitle="Active inventory categories"
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
                <Card className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <h3 className="font-semibold">Import Actions</h3>
                            <p className="text-sm text-muted-foreground">
                                Run full inventory updates across the configured
                                sales-settings scope. No per-category import
                                action is required here.
                            </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                            {strategy} • {scope}
                        </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {(["active", "all"] as const).map((value) => (
                            <Button
                                key={value}
                                type="button"
                                size="sm"
                                variant={
                                    scope === value ? "default" : "outline"
                                }
                                onClick={() => setScope(value)}
                            >
                                {value === "active"
                                    ? "Active Scope"
                                    : "All Dyke"}
                            </Button>
                        ))}
                        {(["optimized", "handcrafted"] as const).map(
                            (value) => (
                                <Button
                                    key={value}
                                    type="button"
                                    size="sm"
                                    variant={
                                        strategy === value
                                            ? "default"
                                            : "outline"
                                    }
                                    onClick={() => setStrategy(value)}
                                >
                                    {value}
                                </Button>
                            ),
                        )}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <Button
                            type="button"
                            disabled={isImportRunning}
                            onClick={() =>
                                runFullImport.mutate({
                                    scope,
                                    strategy,
                                    source: "manual",
                                    compare: false,
                                    reset: false,
                                })
                            }
                        >
                            <Icons.Upload className="mr-2 size-4" />
                            Update Inventory
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isImportRunning}
                            onClick={() =>
                                runFullImport.mutate({
                                    scope,
                                    strategy,
                                    source: "manual",
                                    compare: true,
                                    reset: false,
                                })
                            }
                        >
                            <Icons.Search className="mr-2 size-4" />
                            System Check
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={isImportRunning}
                            onClick={() =>
                                runFullImport.mutate({
                                    scope,
                                    strategy,
                                    source: "manual",
                                    compare: false,
                                    reset: true,
                                })
                            }
                        >
                            <Icons.Refresh className="mr-2 size-4" />
                            Full Refresh
                        </Button>
                        <ConfirmBtn
                            variant="outline"
                            icon="Warn"
                            isDeleting={resetInventory.isPending}
                            onClick={async () => {
                                resetInventory.mutate();
                            }}
                        >
                            Reset Only
                        </ConfirmBtn>
                    </div>

                    <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        <div className="font-medium text-foreground">
                            Run notes
                        </div>
                        <div className="mt-1">
                            `Update Inventory` runs the selected scope without
                            reset as a background job. `System Check` runs
                            compare mode. `Full Refresh` resets and rebuilds the
                            selected inventory import scope in the background.
                        </div>
                        {currentRunId && runStatus.data ? (
                            <div className="mt-3 rounded-md bg-background p-3 text-foreground">
                                <div className="font-medium">
                                    {currentRunLabel || "Inventory import"}{" "}
                                    status
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {runStatus.data.status}
                                </div>
                            </div>
                        ) : null}
                        {lastRunSummary ? (
                            <div className="mt-3 rounded-md bg-background p-3 text-foreground">
                                {lastRunSummary}
                            </div>
                        ) : null}
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="space-y-1">
                        <h3 className="font-semibold">System Checks</h3>
                        <p className="text-sm text-muted-foreground">
                            Quick visibility into whether the import area looks
                            safe before you run an update.
                        </p>
                    </div>
                    <div className="mt-4 grid gap-3">
                        {checks.map((check) => (
                            <CheckRow key={check.label} {...check} />
                        ))}
                    </div>
                </Card>
            </div>

            <Card className="p-5">
                <div className="space-y-1">
                    <h3 className="font-semibold">Scope Breakdown</h3>
                    <p className="text-sm text-muted-foreground">
                        Read-only Dyke step visibility for debugging and audit.
                        The primary workflow above is now scope-driven, not
                        category-by-category.
                    </p>
                </div>
                <div className="mt-4">
                    <DataTable scope={scope} />
                </div>
            </Card>
        </div>
    );
}
