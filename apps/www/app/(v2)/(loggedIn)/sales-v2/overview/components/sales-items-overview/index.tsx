import { useDataPage } from "@/lib/data-page-context";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

import { SalesOverviewType } from "../overview-shell";
import DykeDoorItems from "./dyke-door-items";

export default function SalesItemsOverview() {
    const { data } = useDataPage<SalesOverviewType>();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
                <DykeDoorItems />
            </CardContent>
        </Card>
    );
}
