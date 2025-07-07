import { useContext } from "react";
import { cn } from "@/lib/utils";

import { Button } from "@gnd/ui/button";

import { SalesFormContext } from "../ctx";

export default function InvoiceItemsSelection() {
    const { itemSelector } = useContext(SalesFormContext);
    if (itemSelector.hasSelection())
        return (
            <div className="fixed bottom-0 left-0  right-0 mb-24 md:grid  md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="hidden  md:block" />
                <div className="lg:gap-10 2xl:grid 2xl:grid-cols-[1fr_300px] ">
                    <div className="flex justify-center">
                        <div className="space-x-2 rounded-full border border-gray-600 bg-foreground p-3 px-4 shadow">
                            <Button size="sm" variant={"secondary"}>
                                Clear
                            </Button>
                            <Button size="sm" variant={"secondary"}>
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    return null;
}
