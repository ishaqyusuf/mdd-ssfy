import { useCommunityInventoryParams } from "@/hooks/use-community-inventory-params";
import Sheet from "@gnd/ui/custom/sheet";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Suspense } from "react";

export function CommunityInventoryOverviewSheet() {
    const { opened, setParams } = useCommunityInventoryParams();
    return (
        <Sheet
            open={opened}
            onOpenChange={(e) => {
                setParams(null);
            }}
            sheetName="community-inventory"
        >
            <Suspense
                fallback={
                    <>
                        <Skeletons.Dashboard />
                    </>
                }
            >
                <Content />
            </Suspense>
        </Sheet>
    );
}

function Content() {
    return (
        <Sheet.Content>
            <Sheet.Header>
                <Sheet.Title>Overview</Sheet.Title>
            </Sheet.Header>
        </Sheet.Content>
    );
}

