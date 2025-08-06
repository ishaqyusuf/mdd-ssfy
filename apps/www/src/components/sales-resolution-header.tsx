import { OrderSearchFilter } from "./sales-order-search-filter";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { SalesResoltionSearchFilter } from "./sales-resolution-search-filter";

export function SalesResolutionHeader({}) {
    return (
        <div className="flex justify-between">
            <SalesResoltionSearchFilter />
            <Button asChild size="sm">
                <Link href="/sales-book/create-order">
                    <Icons.Add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button>
        </div>
    );
}

