import { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Item, Table } from "@gnd/ui/composite";

export function InstallCostLine({
    rate,
    index,
}: {
    rate: RouterOutputs["community"]["getCommunityInstallCostRates"]["communityInstallCostRates"][number];
    index: number;
}) {
    return (
        <Table.Row>
            <Table.Cell>
                <Item.Title>{rate.title}</Item.Title>
            </Table.Cell>
            <Table.Cell>
                <Item.Description>${rate.unitCost}</Item.Description>
            </Table.Cell>
            <Table.Cell>
                <Badge variant="secondary">{rate.unit}</Badge>
            </Table.Cell>
        </Table.Row>
    );
}

