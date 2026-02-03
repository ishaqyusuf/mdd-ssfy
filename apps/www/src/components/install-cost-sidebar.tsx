"use client";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { Button } from "@gnd/ui/button";
import { Sidebar } from "@gnd/ui/composite";
import { Icons } from "@gnd/ui/custom/icons";

export function InstallCostSidebar() {
    const { editCommunityModelInstallCostId, openToSide, setParams } =
        useCommunityInstallCostParams();
    return (
        <Sidebar
            collapsible="none"
            hidden={!openToSide || !editCommunityModelInstallCostId}
            className="sticky top-0 hidden h-svh border-l lg:flex"
        >
            <Sidebar.Content className="w-sm">
                <div className="p-4">
                    <div className="flex">
                        <p className="font-medium text-2xl">
                            Install Cost Sidebar
                        </p>
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
                    <p className="text-sm text-muted-foreground">
                        This is a placeholder for the install cost sidebar
                        content.
                    </p>
                </div>
            </Sidebar.Content>
        </Sidebar>
    );
}

