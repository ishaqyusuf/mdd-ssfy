"use client";
import {
    BuilderModelInstallsProvider,
    ModelInstallConfigProvider,
    useCreateBuilderModelInstallsContext,
    useCreateModelInstallConfigContext,
} from "@/hooks/use-model-install-config";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Sidebar } from "@gnd/ui/namespace";
import { Icons } from "@gnd/ui/icons";
import { CommunityInstallCostForm } from "./forms/community-install-cost-form";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useEffect, useRef } from "react";
import { BuilderTaskItem } from "./modals/model-install-cost-modal/builder-task-item";
import { AddNewInstallCost } from "./modals/model-install-cost-modal/add-new-install-cost";
import { InstallConfiguration } from "./modals/model-install-cost-modal/install-configuration";
import { useSidebar } from "@gnd/ui/sidebar";
import { Sheet, SheetContent } from "@gnd/ui/sheet";
import { useMediaQuery } from "@gnd/ui/hooks";
import { AlertTriangle } from "lucide-react";

export function InstallCostSidebar() {
    const { editCommunityModelInstallCostId, openToSide, setParams } =
        useCommunityInstallCostParams();
    const { setParams: setModelCostParams } = useCommunityModelCostParams();
    const { setOpen } = useSidebar();
    const isMdOrBelow = useMediaQuery("(max-width: 1023px)");
    const trpc = useTRPC();
    const modelInstallCtx = useCreateModelInstallConfigContext();
    const builderModelInstallsCtx =
        useCreateBuilderModelInstallsContext(modelInstallCtx);
    const initializedModelIdRef = useRef<number | null>(null);
    const tabValue = modelInstallCtx.params.mode === "v1" ? "v1" : "v2";
    const isPanelOpen = Boolean(openToSide && editCommunityModelInstallCostId);
    const { data: modelCostHistory, isPending: isModelCostHistoryPending } =
        useQuery(
            trpc.community.communityModelCostHistory.queryOptions(
                {
                    id: editCommunityModelInstallCostId!,
                },
                {
                    enabled: !!editCommunityModelInstallCostId,
                },
            ),
        );

    useEffect(() => {
        if (isMdOrBelow) {
            setOpen(false);
            return;
        }
        setOpen(isPanelOpen);
    }, [isMdOrBelow, isPanelOpen, setOpen]);

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
    const shouldShowModelCostAlert =
        !!editCommunityModelInstallCostId &&
        !isModelCostHistoryPending &&
        !modelCostHistory?.modelCosts?.length;
    const installCostReturnPayload = editCommunityModelInstallCostId
        ? {
              editCommunityModelInstallCostId,
              mode: modelInstallCtx.params.mode,
              selectedBuilderTaskId:
                  modelInstallCtx.params.selectedBuilderTaskId ?? null,
              requestBuilderTaskId:
                  modelInstallCtx.params.requestBuilderTaskId ?? null,
              contractorId: modelInstallCtx.params.contractorId ?? null,
              jobId: modelInstallCtx.params.jobId ?? null,
              view: modelInstallCtx.params.view,
              jobPayload: modelInstallCtx.params.jobPayload ?? null,
          }
        : null;

    const openBuilderModelCost = () => {
        if (!editCommunityModelInstallCostId || !installCostReturnPayload) {
            return;
        }
        setParams(null).then(() => {
            setModelCostParams({
                editModelCostTemplateId: editCommunityModelInstallCostId,
                editModelCostId: modelCostHistory?.modelCosts?.[0]?.id || -1,
                returnToInstallCost: installCostReturnPayload,
            });
        });
    };

    const panelContent = (
        <>
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
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
                        {shouldShowModelCostAlert ? (
                            <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
                                    <div className="flex-1">
                                        <p className="font-semibold">
                                            Builder model cost is not configured
                                        </p>
                                        <p className="text-sm text-amber-800">
                                            This install cost form opened without
                                            any model cost list. Open Builder
                                            Model Cost to configure it, then
                                            you&apos;ll return here automatically.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="mt-3"
                                    onClick={openBuilderModelCost}
                                >
                                    Open Builder Model Cost
                                </Button>
                            </div>
                        ) : null}
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
            </div>
            <div
                id="install-cost-sidebar-footer"
                className={cn(
                    "border-t bg-background px-4 py-3",
                    tabValue === "v1"
                        ? "flex items-center justify-end gap-4"
                        : "hidden",
                )}
            />
        </>
    );

    if (isMdOrBelow) {
        return (
            <Sheet
                open={isPanelOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setParams(null);
                    }
                }}
            >
                <SheetContent
                    side="right"
                    hideClose
                    className="w-screen max-w-none p-0"
                >
                    <div className="flex h-full flex-col">{panelContent}</div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Sidebar
            side="right"
            collapsible="offcanvas"
            className="top-[var(--header-height)] h-[calc(100svh-var(--header-height))] border-l bg-background"
        >
            <Sidebar.Content className="flex min-h-0 w-full max-w-sm flex-col overflow-hidden">
                {panelContent}
            </Sidebar.Content>
        </Sidebar>
    );
}
