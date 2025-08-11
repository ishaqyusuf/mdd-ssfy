import { Form } from "@gnd/ui/form";
import { useInventoryProductForm } from "./form-context";
import { ProductInformationSection } from "./product-information-section";
import { Accordion } from "@gnd/ui/accordion";
import { useState } from "react";
import { ProductVariantsSection } from "./product-variants-section";
import { ProductProvider } from "./context";

export function InventoryProductForm({}) {
    const form = useInventoryProductForm();
    const [sections, setSections] = useState<string[]>([
        "general",
        "variant-0",
    ]);
    return (
        <Form {...form}>
            <Accordion
                type="multiple"
                key={sections.join("-")}
                defaultValue={sections}
                className="space-y-6"
            >
                <ProductProvider>
                    <ProductInformationSection />
                    <ProductVariantsSection />
                </ProductProvider>
            </Accordion>
        </Form>
    );
}

