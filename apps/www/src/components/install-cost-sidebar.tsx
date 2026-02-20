"use client";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Sidebar } from "@gnd/ui/namespace";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { CommunityInstallCostForm } from "./forms/community-install-cost-form";
import { Skeleton } from "@gnd/ui/skeleton";

export function InstallCostSidebar() {
    const { editCommunityModelInstallCostId, openToSide, setParams } =
        useCommunityInstallCostParams();
    const { data, isPending, error } = useQuery(
        useTRPC().community.communityInstallCostForm.queryOptions(
            {
                projectId: editCommunityModelInstallCostId,
            },
            {
                enabled: !!editCommunityModelInstallCostId && openToSide,
            },
        ),
    );
    return (
        <Sidebar
            collapsible="none"
            hidden={!openToSide || !editCommunityModelInstallCostId}
            className="sticky top-0 hidden h-svh border-l lg:flex"
        >
            <Sidebar.Content className="w-sm">
                <div className="p-4">
                    <div className="flex">
                        <p className="font-medium text-2xl">Install Costs</p>
                        <div className="flex-1"></div>
                        <Button
                            size="icon-xs"
                            variant="destructive"
                            onClick={(e) => {
                                setParams(null);
                            }}
                        >
                            <Icons.X className="size-4" />
                        </Button>
                    </div>
                </div>
                {isPending ? (
                    <div className="grid gap-2">
                        <>
                            <Skeleton className="h-10" />
                            {[...Array(10)].map((_, i) => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </>
                    </div>
                ) : (
                    <CommunityInstallCostForm model={data} />
                )}
            </Sidebar.Content>
            <Sidebar.Footer
                id="install-cost-sidebar-footer"
                className="pb-24 flex items-center justify-end gap-4 flex-row"
            ></Sidebar.Footer>
        </Sidebar>
    );
}

