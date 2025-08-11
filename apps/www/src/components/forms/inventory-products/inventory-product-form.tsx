import { Form } from "@gnd/ui/form";
import { useInventoryProductForm } from "./form-context";
import { ProductInformationSection } from "./production-information-section";
import { Accordion } from "@gnd/ui/accordion";
import { useState } from "react";

export function InventoryProductForm({}) {
    const form = useInventoryProductForm();
    const [sections, setSections] = useState<string[]>(["general"]);
    return (
        <Form {...form}>
            <Accordion
                type="multiple"
                key={sections.join("-")}
                defaultValue={sections}
                className="space-y-6"
            >
                <ProductInformationSection />
            </Accordion>
        </Form>
    );
}

