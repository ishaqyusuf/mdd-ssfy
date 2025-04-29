import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

import { CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { ProductionItemAssignments } from "./production-assignments";
import { useProductionItem } from "./production-tab";

export function ProductionItemDetail({}) {
    const ctx = useProductionItem();
    const { queryCtx } = ctx;
    return (
        <div className="">
            <Tabs
                value={queryCtx.params?.["prod-item-tab"]}
                onValueChange={(e) => {
                    queryCtx.setParams({
                        "prod-item-tab": e,
                    });
                }}
                defaultValue="details"
                className=" w-full"
            >
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                </TabsList>
                {/* Details Tab */}
                <TabsContent value="details" className="mt-4 space-y-4">
                    <Details />
                </TabsContent>
                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-4 space-y-4">
                    <Note
                        subject={"Production Note"}
                        headline=""
                        statusFilters={["public"]}
                        typeFilters={["production", "general"]}
                        tagFilters={[
                            noteTagFilter(
                                "itemControlUID",
                                ctx?.item?.controlUid,
                            ),
                            noteTagFilter("salesItemId", ctx?.item?.itemId),
                            noteTagFilter("salesId", ctx?.item?.salesId),
                        ]}
                    />
                </TabsContent>
                {/* Assignments Tab */}
                <TabsContent value="assignments" className="mt-4 space-y-4">
                    <ProductionItemAssignments />
                </TabsContent>
            </Tabs>
        </div>
    );
}
function Details() {
    const ctx = useProductionItem();
    return (
        <div className="grid grid-cols-2 gap-3 px-6">
            {ctx?.item?.configs
                ?.filter((c) => !c.hidden)
                ?.map((config, k) => (
                    <div key={k} className="space-y-1">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                            {config?.label}:
                        </p>
                        <p
                            className={cn(
                                "text-sm font-medium uppercase",
                                config?.color == "red" && "text-red-600",
                            )}
                        >
                            {config?.value}
                        </p>
                    </div>
                ))}
        </div>
    );
}
