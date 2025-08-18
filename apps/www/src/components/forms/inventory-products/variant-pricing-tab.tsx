import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { useState } from "react";
import { useVariant } from "./context";

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
                    <AccordionTrigger>Update Price</AccordionTrigger>
                    <AccordionContent></AccordionContent>
                </AccordionItem>
            </Accordion>
        </>
    );
}

