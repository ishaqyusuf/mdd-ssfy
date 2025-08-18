import { Form } from "@gnd/ui/form";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useInventoryCategoryForm } from "./form-context";

export function InventoryCategoryForm({}) {
    const form = useInventoryCategoryForm();
    // const { categoryId } = useInventoryCategoryParams();

    return (
        <Form {...form}>
            <div className=""></div>
        </Form>
    );
}

