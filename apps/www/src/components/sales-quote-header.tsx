import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { SalesQuoteSearchFilter } from "./sales-quote-search-filter";

export function SalesQuoteHeader({}) {
    return (
        <div className="flex justify-between">
            <SalesQuoteSearchFilter />
            <Button asChild size="sm">
                <Link href="/sales-book/create-quote">
                    <Icons.Add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button>
        </div>
    );
}

