import { useInboundView } from "@/hooks/use-inbound-filter-params";
import { CustomSheet, CustomSheetContent } from "./custom-sheet-content";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

export function InboundOverviewSheet() {
    const { params, setParams } = useInboundView();

    return (
        <CustomSheet
            size="lg"
            sheetName="inbound-view"
            open={!!params.viewInboundId}
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            <SheetHeader>
                <SheetTitle>{params?.payload?.orderId}</SheetTitle>
                <SheetDescription>
                    {params?.payload?.displayName}
                </SheetDescription>
            </SheetHeader>
            <CustomSheetContent>
                <Note
                    admin
                    readonOnly
                    tagFilters={[
                        noteTagFilter("salesId", String(params.viewInboundId)),
                        // noteTagFilter("type", "sales inbound"),
                    ]}
                    headline={"Sales Inbound"}
                    typeFilters={["inbound"]}
                    statusFilters={["public", "private"]}
                    subject={`Sales Note`}
                    // headline={`${params?.payload?.orderId}`}
                />
            </CustomSheetContent>
        </CustomSheet>
    );
}

