import { CustomModal, CustomModalContent } from "../custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { CommunityInstallCostForm } from "../../forms/community-install-cost-form";
import { Skeleton } from "@gnd/ui/skeleton";
import { Badge } from "@gnd/ui/badge";
import { AlertTriangle, Layers } from "lucide-react";
import { useEffect } from "react";
import { SubmitButton } from "@gnd/ui/submit-button";
import { BuilderTaskItem } from "./builder-task-item";
import { DropdownMenu, Sidebar } from "@gnd/ui/composite";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
    BuilderModelInstallsProvider,
    ModelInstallConfigProvider,
    useCreateBuilderModelInstallsContext,
    useCreateModelInstallConfigContext,
} from "@/hooks/use-model-install-config";
import { InstallConfiguration } from "./install-configuration";
import { AddNewInstallCost } from "./add-new-install-cost";

export function ModelInstallCostModal() {
    const sideBarView = true;
    const ctx = useCreateModelInstallConfigContext();
    const { data, isPending, dataV2, isV2 } = ctx;
    const {
        editCommunityModelInstallCostId,
        setParams,
        mode,
        selectedBuilderTaskId,
        openToSide,
    } = useCommunityInstallCostParams();
    const _modelInstallContext = useCreateBuilderModelInstallsContext(ctx);
    return (
        <CustomModal
            // className="overflow-hidden sp-0 md:max-h-full md:h-auto md:min-h-0  md:max-w-[700px] lg:max-w-[800px]"
            className=""
            open={!!editCommunityModelInstallCostId && !openToSide}
            onOpenChange={(e) => {
                setParams(null);
            }}
            size={isV2 ? "4xl" : "xl"}
            title={
                !isV2 ? (
                    `Install Cost (${data?.title})`
                ) : (
                    <>
                        <span>
                            {dataV2?.modelName || "..."} -{" "}
                            <Badge
                                variant="outline"
                                className="uppercase text-sm "
                            >
                                {dataV2?.builderName}
                            </Badge>
                        </span>
                    </>
                )
            }
            description={isV2 ? dataV2?.projectName : data?.subtitle}
        >
            <ModelInstallConfigProvider value={ctx}>
                {isV2 ? (
                    !sideBarView ? (
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden border-t">
                            <div className="w-full md:w-72 bg-muted border-b md:border-b-0 md:border-r border-border flex flex-col shrink-0">
                                <div className="p-4 border-b border-border bg-muted/10">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Layers size={14} /> Builder Tasks
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {dataV2?.builderTasks?.map((task) => (
                                        <BuilderTaskItem
                                            key={task.id}
                                            task={task}
                                        />
                                    ))}
                                </div>
                            </div>
                            <CustomModal.Content className="h-[60vh]">
                                <span></span>
                                <CustomModal.Footer>
                                    <SubmitButton type="button">
                                        Save
                                    </SubmitButton>
                                </CustomModal.Footer>
                            </CustomModal.Content>
                        </div>
                    ) : (
                        <Sidebar.Provider
                            style={
                                {
                                    // "--sidebar-width": "10rem",
                                    // "--sidebar-width-mobile": "10rem",
                                }
                            }
                            className="item-start min-h-0"
                        >
                            <Sidebar
                                collapsible="none"
                                className="hidden md:border-t md:flex w-[300px]  overflow-x-hidden"
                            >
                                {/* <Sidebar.Header>
                                    <div className="p-4 border-b border-border bg-muted/10">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Layers size={14} /> Builder Tasks
                                        </h3>
                                    </div>
                                </Sidebar.Header> */}
                                <Sidebar.Content className="flex-1">
                                    <Sidebar.Group className="">
                                        <Sidebar.Menu>
                                            {dataV2?.builderTasks?.map(
                                                (task) => (
                                                    <BuilderTaskItem
                                                        sideBarMode={
                                                            sideBarView
                                                        }
                                                        key={task.id}
                                                        task={task}
                                                    />
                                                ),
                                            )}
                                        </Sidebar.Menu>
                                    </Sidebar.Group>
                                </Sidebar.Content>
                                {/* <Sidebar.Footer>
                                    <span>FOOTER.</span>
                                </Sidebar.Footer> */}
                            </Sidebar>
                            <div className="flex-1 border-l border-t">
                                <BuilderModelInstallsProvider
                                    value={_modelInstallContext}
                                >
                                    <div className="bg-amber-50 hidden dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800 px-6 py-3 flex items-start gap-3">
                                        <AlertTriangle className="text-amber-600 mt-0.5 size-10" />
                                        <div>
                                            <p className="font-bold text-amber-800 dark:text-amber-200">
                                                Global Builder Configuration
                                            </p>
                                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                                Changes to the install cost list
                                                below will update{" "}
                                                <strong>
                                                    {dataV2?.builderName}
                                                </strong>{" "}
                                                globally. This affects ALL
                                                models using the{" "}
                                                <em>
                                                    {dataV2?.builderTasks?.find(
                                                        (a) =>
                                                            a.id ===
                                                            selectedBuilderTaskId,
                                                    )?.taskName || "selected"}
                                                </em>{" "}
                                                task.
                                            </p>
                                        </div>
                                    </div>
                                    <AddNewInstallCost />
                                    <CustomModal.Content className="h-[60vh] relative -mx-0">
                                        <InstallConfiguration />
                                    </CustomModal.Content>
                                </BuilderModelInstallsProvider>
                            </div>
                            {/* <CustomModal.Footer>
                                <SubmitButton
                                    isSubmitting={false}
                                    type="button"
                                >
                                    Save
                                </SubmitButton>
                            </CustomModal.Footer> */}
                        </Sidebar.Provider>
                    )
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="" id="installCostModalAction"></div>
                        <CustomModal.Content className="lg:max-h-[55vh] overflow-auto">
                            {isPending ? (
                                <div className="grid gap-2">
                                    <>
                                        <Skeleton className="h-10" />
                                        {[...Array(10)].map((_, i) => (
                                            <Skeleton
                                                key={i}
                                                className="h-16"
                                            />
                                        ))}
                                    </>
                                </div>
                            ) : (
                                <CommunityInstallCostForm model={data} />
                            )}
                        </CustomModal.Content>
                    </div>
                )}
            </ModelInstallConfigProvider>
        </CustomModal>
    );
}

