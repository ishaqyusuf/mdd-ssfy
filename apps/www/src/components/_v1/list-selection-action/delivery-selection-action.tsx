"use client";

import Link from "@/components/link";
import { updateSalesDelivery } from "@/app/(v1)/(loggedIn)/sales/_actions/_sales-pickup";
import useQueryParams from "@/lib/use-query-params";

import { Button } from "@gnd/ui/button";
import { DropdownMenuItem } from "@gnd/ui/dropdown-menu";

import { RowActionMoreMenu } from "../data-table/data-table-row-actions";
import { parseAsStringEnum, useQueryStates } from "nuqs";

export function DeliveryBatchAction({ items }) {
    const [queryParams, setQueryParams] = useQueryStates({
        _deliveryStatus: parseAsStringEnum(["queued", "ready"] as const),
    });
    async function _updateSales(status) {
        await updateSalesDelivery(
            items.map((i) => i.id),
            status,
        );
    }
    return (
        <>
            {queryParams?._deliveryStatus == "queued" && (
                <Button asChild size={"sm"} className="h-8">
                    <Link
                        href={`/sales/delivery/get-ready?orderIds=${items.map(
                            ({ slug }) => slug,
                        )}`}
                    >
                        <span>Ready</span>
                    </Link>
                </Button>
            )}
            {queryParams?._deliveryStatus == "ready" && (
                <Button asChild size={"sm"} className="h-8">
                    <Link
                        href={`/sales/delivery/load?orderIds=${items.map(
                            ({ slug }) => slug,
                        )}`}
                    >
                        <span>Ready</span>
                    </Link>
                </Button>
            )}
            <RowActionMoreMenu>
                {["Ready", "In Transit", "Returned", "Delivered"]?.map((e) => (
                    <DropdownMenuItem
                        onClick={(_e) => _updateSales(e)}
                        className="cursor-pointer hover:bg-accent"
                        key={e}
                    >
                        {e}
                    </DropdownMenuItem>
                ))}
                {/* <RowActionMenuItem>Delivered</RowActionMenuItem> */}
            </RowActionMoreMenu>
        </>
    );
}
