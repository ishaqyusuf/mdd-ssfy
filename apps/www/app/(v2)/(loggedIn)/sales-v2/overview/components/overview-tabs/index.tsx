"use client";

import { useDataPage } from "@/lib/data-page-context";

import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader } from "@gnd/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { SalesOverviewType } from "../overview-shell";
import { SalesOverviewDykeInvoiceTab } from "./dyke-doors-sales-overview-tab";
import { ShelfItemsSalesOverviewTab } from "./shelf-items-sales-overview-tab";

export default function OverviewTabs() {
    const { data } = useDataPage<SalesOverviewType>();

    const defaultValue = data.isDyke
        ? data.totalDoors
            ? "dyke-doors"
            : "shelf-items"
        : "invoice";

    return (
        <Card>
            {/* <CardHeader></CardHeader> */}
            <CardContent className="mt-6">
                <Tabs defaultValue={defaultValue}>
                    <TabsList className="w-full justify-start">
                        {data.isDyke ? (
                            <>
                                <TabsTrigger
                                    disabled={data.totalDoors == 0}
                                    value={"dyke-doors"}
                                >
                                    Doors
                                    <Badge
                                        className="mx-2"
                                        variant={"secondary"}
                                    >
                                        {data.totalDoors}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    disabled={data.shelfItems.length == 0}
                                    value={"invoice"}
                                >
                                    Shelf Items{" "}
                                    <Badge
                                        className="mx-2"
                                        variant={"secondary"}
                                    >
                                        {data.shelfItems.length}
                                    </Badge>
                                </TabsTrigger>
                            </>
                        ) : (
                            <TabsTrigger value={"invoice"}>
                                {"Invoice Lines"}
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="production">
                            Production Items
                        </TabsTrigger>
                    </TabsList>
                    <SalesOverviewDykeInvoiceTab />
                    <ShelfItemsSalesOverviewTab />
                </Tabs>
            </CardContent>
        </Card>
    );
}
