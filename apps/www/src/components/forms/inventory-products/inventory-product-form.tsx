import { Form } from "@gnd/ui/form";
import { useInventoryProductForm } from "./form-context";
import { ProductInformationSection } from "./product-information-section";
import { Accordion } from "@gnd/ui/accordion";
import { useState } from "react";
import { ProductVariantsSection } from "./product-variants-section";
import { ProductProvider } from "./context";
import { useInventoryParams } from "@/hooks/use-inventory-params";

export function InventoryProductForm({}) {
    const form = useInventoryProductForm();
    const { productId } = useInventoryParams();
    const [sections, setSections] = useState<string[]>(
        productId > 0 ? ["variants"] : ["general"],
    );
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

