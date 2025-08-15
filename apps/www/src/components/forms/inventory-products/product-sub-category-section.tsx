import { Package } from "lucide-react";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";

export function ProductSubCategorySection({}) {
    return (
        <AccordionItem value="subcategories">
            <AccordionTrigger className="">
                <div className="flex gap-4 items-center">
                    <Package className="size-4" />
                    <span>Product Sub Categories</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className=""></AccordionContent>
        </AccordionItem>
    );
}

