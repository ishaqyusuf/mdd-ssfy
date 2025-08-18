import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { useState } from "react";
import { useVariant } from "./context";
import { VariantPriceForm } from "./variant-price-form";

export function VariantPricingTab({}) {
    const [sections, setSections] = useState<string[]>(["form"]);
    const ctx = useVariant();
    return (
        <>
            <Accordion
                type="multiple"
                defaultValue={sections}
                key={sections.join("-")}
            >
                <AccordionItem value="form">
                    <AccordionTrigger className="hover:bg-accent px-4">
                        Update Price
                    </AccordionTrigger>
                    <AccordionContent>
                        <VariantPriceForm />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </>
    );
}

