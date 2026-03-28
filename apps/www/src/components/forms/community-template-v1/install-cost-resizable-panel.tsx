"use client";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import {
    BuilderModelInstallsProvider,
    ModelInstallConfigProvider,
    useCreateBuilderModelInstallsContext,
    useCreateModelInstallConfigContext,
} from "@/hooks/use-model-install-config";
import { useBuilderParams } from "@/hooks/use-builder-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useEffect, useRef } from "react";
import { BuilderTaskItem } from "@/components/modals/model-install-cost-modal/builder-task-item";
import { AddNewInstallCost } from "@/components/modals/model-install-cost-modal/add-new-install-cost";
import { InstallConfiguration } from "@/components/modals/model-install-cost-modal/install-configuration";
import { Sheet, SheetContent } from "@gnd/ui/sheet";
import { useMediaQuery } from "@gnd/ui/hooks";
import { AlertTriangle } from "lucide-react";
import { cn } from "@gnd/ui/cn";

interface Props {
    children: React.ReactNode;
}

export function InstallCostResizablePanel({ children }: Props) {
    const { editCommunityModelInstallCostId, openToSide, setParams } =
        useCommunityInstallCostParams();
    const { setParams: setBuilderParams } = useBuilderParams();
    const isMdOrBelow = useMediaQuery("(max-width: 1023px)");
    const modelInstallCtx = useCreateModelInstallConfigContext();
    const builderModelInstallsCtx =
        useCreateBuilderModelInstallsContext(modelInstallCtx);
    const initializedModelIdRef = useRef<number | null>(null);
    const isPanelOpen = Boolean(openToSide && editCommunityModelInstallCostId);

    useEffect(() => {
        if (!openToSide || !editCommunityModelInstallCostId) {
            initializedModelIdRef.current = null;
            return;
        }
        if (initializedModelIdRef.current === editCommunityModelInstallCostId) {
            return;
        }
        initializedModelIdRef.current = editCommunityModelInstallCostId;
        if (modelInstallCtx.params.mode !== "v2") {
            setParams({ mode: "v2" });
        }
    }, [
        openToSide,
        editCommunityModelInstallCostId,
        modelInstallCtx.params.mode,
        setParams,
    ]);

    const estimatedBaseCost = Object.values(
        builderModelInstallsCtx.builderTaskIntallCosts || {},
    ).reduce((total, item) => total + (item?.total || 0), 0);
    const shouldShowModelCostAlert =
        !!editCommunityModelInstallCostId &&
        modelInstallCtx.isV2 &&
        !modelInstallCtx.isPending &&
        !modelInstallCtx.dataV2?.builderTasks?.length;
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

    const openBuilderForm = () => {
        if (!modelInstallCtx.dataV2?.builderId || !installCostReturnPayload) {
            return;
        }
        setParams(null).then(() => {
            setBuilderParams({
                openBuilderId: modelInstallCtx.dataV2.builderId,
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
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
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
                                    <div className="space-y-3">
                                        {shouldShowModelCostAlert ? (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
                                                    <div className="flex-1">
                                                        <p className="font-semibold">
                                                            Builder model is not
                                                            configured
                                                        </p>
                                                        <p className="text-sm text-amber-800">
                                                            This v2 install-cost
                                                            tab opened without
                                                            any builder task
                                                            list. Open the
                                                            builder form to
                                                            configure it, then
                                                            you&apos;ll return
                                                            here automatically.
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="mt-3"
                                                    onClick={openBuilderForm}
                                                >
                                                    Open Builder Form
                                                </Button>
                                            </div>
                                        ) : null}
                                        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                                            <div className="min-w-0 flex-1">
                                                <BuilderTaskItem sideBarMode />
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
                                    </div>
                                ) : (
                                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                                        <p className="text-sm font-medium text-destructive">
                                            Unable to load V2 install costs
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </BuilderModelInstallsProvider>
                </ModelInstallConfigProvider>
            </div>
            <div
                id="install-cost-sidebar-footer"
                className="hidden border-t bg-background px-4 py-3"
            />
        </>
    );

    // Mobile/md: use Sheet overlay
    if (isMdOrBelow) {
        return (
            <>
                {children}
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
                        className="max-md:w-screen sm:max-w-none max-sm:w-screen p-0"
                    >
                        <div className="flex h-full flex-col">
                            {panelContent}
                        </div>
                    </SheetContent>
                </Sheet>
            </>
        );
    }

    // Desktop lg+: keep install cost fixed to the viewport with its own scroll
    if (!isPanelOpen) {
        return <>{children}</>;
    }

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_28rem]">
            <div className={cn("min-w-0", "lg:pr-6")}>
                {children}
            </div>
            <div className="sticky top-4 max-h-[calc(100svh-1rem)] overflow-hidden">
                <div className="flex h-full max-h-[calc(100svh-1rem)] flex-col overflow-hidden border-l bg-background">
                    {panelContent}
                </div>
            </div>
        </div>
    );
}
