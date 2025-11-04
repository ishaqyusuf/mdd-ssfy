import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { SalesQuoteSearchFilter } from "./sales-quote-search-filter";
import { SalesCustomTab } from "./sales-custom-tab";
import { ButtonGroup } from "@gnd/ui/button-group";
import { DropdownMenu } from "@gnd/ui/composite";
import { Separator } from "@gnd/ui/separator";
import { CreateSalesBtn } from "./create-sales-btn";

export function SalesQuoteHeader({}) {
    return (
        <div className="flex gap-4 items-center">
            <SalesQuoteSearchFilter />
            <div className="flex-1"></div>
            <SalesCustomTab />
            <CreateSalesBtn quote />
        </div>
    );
}

