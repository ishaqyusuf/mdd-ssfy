"use client";
import {
    BuilderModelInstallsProvider,
    ModelInstallConfigProvider,
    useCreateBuilderModelInstallsContext,
    useCreateModelInstallConfigContext,
} from "@/hooks/use-model-install-config";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Sidebar } from "@gnd/ui/namespace";
import { Icons } from "@gnd/ui/icons";
import { CommunityInstallCostForm } from "./forms/community-install-cost-form";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useEffect, useRef } from "react";
import { BuilderTaskItem } from "./modals/model-install-cost-modal/builder-task-item";
import { AddNewInstallCost } from "./modals/model-install-cost-modal/add-new-install-cost";
import { InstallConfiguration } from "./modals/model-install-cost-modal/install-configuration";

export function InstallCostSidebar() {
    const { editCommunityModelInstallCostId, openToSide, setParams } =
        useCommunityInstallCostParams();
    const modelInstallCtx = useCreateModelInstallConfigContext();
    const builderModelInstallsCtx =
        useCreateBuilderModelInstallsContext(modelInstallCtx);
    const initializedModelIdRef = useRef<number | null>(null);
    const tabValue = modelInstallCtx.params.mode === "v1" ? "v1" : "v2";

    useEffect(() => {
        if (!openToSide || !editCommunityModelInstallCostId) {
            initializedModelIdRef.current = null;
            return;
        }
        if (initializedModelIdRef.current === editCommunityModelInstallCostId) {
            return;
        }
        initializedModelIdRef.current = editCommunityModelInstallCostId;
        if (tabValue !== "v2") {
            setParams({ mode: "v2" });
        }
    }, [openToSide, editCommunityModelInstallCostId, tabValue, setParams]);

    const estimatedBaseCost = Object.values(
        builderModelInstallsCtx.builderTaskIntallCosts || {},
    ).reduce((total, item) => total + (item?.total || 0), 0);

    return (
        <Sidebar
            collapsible="none"
            hidden={!openToSide || !editCommunityModelInstallCostId}
            className="top-[var(--header-height)] h-[calc(100svh-var(--header-height))] border-l bg-background"
        >
            <Sidebar.Content className="flex w-sm flex-col overflow-hidden">
                <div className="flex items-center gap-3 border-b px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Community Template
                        </p>
                        <p className="truncate text-xl font-semibold">
                            Install Costs
                        </p>
                    </div>
                    <div className="flex-1" />
                    <Button
                        size="icon-xs"
                        variant="destructive"
                        aria-label="Close install costs sidebar"
                        onClick={() => {
                            setParams(null);
                        }}
                    >
                        <Icons.X className="size-4" />
                    </Button>
                </div>
                <ModelInstallConfigProvider value={modelInstallCtx}>
                    <BuilderModelInstallsProvider
                        value={builderModelInstallsCtx}
                    >
                        <Tabs
                            value={tabValue}
                            onValueChange={(value) => {
                                setParams({
                                    mode: value as "v1" | "v2",
                                });
                            }}
                            className="flex min-h-0 flex-1 flex-col"
                        >
                            <div className="border-b">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="v2">V2</TabsTrigger>
                                    <TabsTrigger value="v1">V1</TabsTrigger>
                                </TabsList>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                                <TabsContent
                                    value="v2"
                                    className="mt-0 space-y-3"
                                >
                                    {modelInstallCtx.isPending ? (
                                        <div className="grid gap-3">
                                            <Skeleton className="h-9 w-full" />
                                            {[...Array(5)].map((_, i) => (
                                                <Skeleton
                                                    key={i}
                                                    className="h-11 w-full rounded-md"
                                                />
                                            ))}
                                        </div>
                                    ) : modelInstallCtx.dataV2 ? (
                                        <>
                                            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                                                <div className="min-w-0 flex-1">
                                                    <BuilderTaskItem
                                                        sideBarMode
                                                    />
                                                </div>
                                                <div className="shrink-0 border-l pl-3 text-right leading-tight">
                                                    <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
                                                        Est. Base
                                                    </p>
                                                    <p className="text-sm font-semibold">
                                                        $
                                                        {estimatedBaseCost.toFixed(
                                                            2,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <AddNewInstallCost />
                                            <InstallConfiguration />
                                        </>
                                    ) : (
                                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                                            <p className="text-sm font-medium text-destructive">
                                                Unable to load V2 install costs
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="v1" className="mt-0">
                                    {modelInstallCtx.isPending ? (
                                        <div className="grid gap-3">
                                            <Skeleton className="h-5 w-44" />
                                            {[...Array(8)].map((_, i) => (
                                                <Skeleton
                                                    key={i}
                                                    className="h-14 rounded-md"
                                                />
                                            ))}
                                        </div>
                                    ) : modelInstallCtx.data ? (
                                        <CommunityInstallCostForm
                                            model={modelInstallCtx.data}
                                        />
                                    ) : (
                                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                                            <p className="text-sm font-medium text-destructive">
                                                Unable to load V1 install costs
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </BuilderModelInstallsProvider>
                </ModelInstallConfigProvider>
            </Sidebar.Content>
            <Sidebar.Footer
                id="install-cost-sidebar-footer"
                className={cn(
                    "border-t bg-background px-4 py-3",
                    tabValue === "v1"
                        ? "flex items-center justify-end gap-4"
                        : "hidden",
                )}
            />
        </Sidebar>
    );
}
