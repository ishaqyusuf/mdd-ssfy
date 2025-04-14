import { CardContent } from "@gnd/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { ProductionItemAssignments } from "./production-item-assignments";
import { useProductionItem } from "./production-tab";

export function ProductionItemDetail({}) {
    const ctx = useProductionItem();
    const { queryCtx } = ctx;
    return (
        <CardContent className="">
            <Tabs
                value={queryCtx.params?.["prod-item-tab"]}
                onValueChange={(e) => {
                    queryCtx.setParams({
                        "prod-item-tab": e,
                    });
                }}
                defaultValue="details"
                className="w-full"
            >
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent
                    value="details"
                    className="mt-4 space-y-4"
                ></TabsContent>

                {/* Notes Tab */}
                <TabsContent
                    value="notes"
                    className="mt-4 space-y-4"
                ></TabsContent>

                {/* Assignments Tab */}
                <TabsContent value="assignments" className="mt-4 space-y-4">
                    <ProductionItemAssignments />
                </TabsContent>
            </Tabs>
        </CardContent>
    );
}
