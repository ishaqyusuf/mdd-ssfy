"use client";

import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { Icons } from "@gnd/ui/icons";
import { useInventoryForm } from "./form-context";
import { InventorySuppliersManager } from "@/components/inventory/inventory-suppliers-manager";

export function InventorySuppliersSection() {
    const form = useInventoryForm();
    const suppliers = form.watch("suppliers") || [];
    const defaultSupplierId = form.watch("product.defaultSupplierId");

    return (
        <AccordionItem value="suppliers">
            <AccordionTrigger>
                <div className="flex items-center gap-3">
                    <Icons.Warehouse className="size-4" />
                    <span>Suppliers</span>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <InventorySuppliersManager
                    suppliers={suppliers}
                    defaultSupplierId={defaultSupplierId}
                    onSuppliersChange={(next) =>
                        form.setValue("suppliers", next, {
                            shouldDirty: true,
                        })
                    }
                    onDefaultSupplierChange={(supplierId) =>
                        form.setValue("product.defaultSupplierId", supplierId, {
                            shouldDirty: true,
                        })
                    }
                    title="Supplier Directory"
                    description="Manage shared suppliers here, then use them across variant pricing and purchasing."
                />
            </AccordionContent>
        </AccordionItem>
    );
}
