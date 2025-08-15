import { Form } from "@gnd/ui/form";
import { useInventoryForm } from "./form-context";
import { ProductInformationSection } from "./product-information-section";
import { Accordion } from "@gnd/ui/accordion";
import { useState } from "react";
import { ProductVariantsSection } from "./product-variants-section";
import { ProductProvider } from "./context";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { ProductSubCategorySection } from "./product-sub-category-section";

export function InventoryForm({}) {
    const form = useInventoryForm();
    const { productId } = useInventoryParams();
    const [sections, setSections] = useState<string[]>(
        productId > 0 ? ["variants", "subcategories"] : ["general"],
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
                    {productId < 0 || <ProductSubCategorySection />}
                    <ProductVariantsSection />
                </ProductProvider>
            </Accordion>
        </Form>
    );
}

