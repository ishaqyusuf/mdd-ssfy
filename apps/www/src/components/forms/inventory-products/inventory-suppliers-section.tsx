import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { useFieldArray } from "react-hook-form";
import { useInventoryForm } from "./form-context";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import FormInput from "@/components/common/controls/form-input";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

export function InventorySuppliersSection() {
    const form = useInventoryForm();
    const trpc = useTRPC();
    const suppliersArray = useFieldArray({
        control: form.control,
        name: "suppliers",
        keyName: "_id",
    });
    const supplierReviewQuery = useQuery(
        trpc.inventories.inventorySupplierDykeReview.queryOptions(),
    );

    const syncSuppliersMutation = useMutation(
        trpc.inventories.syncInventorySuppliersFromDyke.mutationOptions({
            onSuccess(data) {
                const current = form.getValues("suppliers") || [];
                const merged = [...current];
                data.forEach((supplier) => {
                    if (merged.find((item) => item.id === supplier.id)) return;
                    merged.push({
                        id: supplier.id,
                        uid: supplier.uid,
                        name: supplier.name,
                        email: "",
                        phone: "",
                        address: "",
                    });
                });
                form.setValue("suppliers", merged, {
                    shouldDirty: true,
                });
                toast({
                    title: "Suppliers synced from Dyke",
                    variant: "success",
                });
                supplierReviewQuery.refetch();
            },
        }),
    );

    return (
        <AccordionItem value="suppliers">
            <AccordionTrigger>
                <div className="flex items-center gap-3">
                    <Icons.Warehouse className="size-4" />
                    <span>Suppliers</span>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                    <div className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                suppliersArray.append({
                                    id: null,
                                    uid: null,
                                    name: "",
                                    email: "",
                                    phone: "",
                                    address: "",
                                })
                            }
                        >
                            <Icons.Plus className="size-4 mr-2" />
                            Add Supplier
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => syncSuppliersMutation.mutate()}
                            disabled={syncSuppliersMutation.isPending}
                        >
                            <Icons.RefreshCw className="size-4 mr-2" />
                            Sync Door Suppliers
                        </Button>
                    </div>

                    {suppliersArray.fields.length ? (
                        <div className="space-y-4">
                            {suppliersArray.fields.map((field, index) => (
                                <div
                                    key={field._id}
                                    className="grid grid-cols-2 gap-4 rounded-lg border p-4"
                                >
                                    <FormInput
                                        label="Name"
                                        control={form.control}
                                        name={`suppliers.${index}.name`}
                                    />
                                    <FormInput
                                        label="Legacy UID"
                                        control={form.control}
                                        name={`suppliers.${index}.uid`}
                                    />
                                    <FormInput
                                        label="Email"
                                        control={form.control}
                                        name={`suppliers.${index}.email`}
                                    />
                                    <FormInput
                                        label="Phone"
                                        control={form.control}
                                        name={`suppliers.${index}.phone`}
                                    />
                                    <FormInput
                                        className="col-span-2"
                                        label="Address"
                                        control={form.control}
                                        name={`suppliers.${index}.address`}
                                    />
                                    <div className="col-span-2 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() =>
                                                suppliersArray.remove(index)
                                            }
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                            No suppliers configured yet. Add suppliers manually
                            or sync the legacy door supplier list from Dyke.
                        </div>
                    )}

                    {supplierReviewQuery.data?.length ? (
                        <div className="space-y-3">
                            <div className="text-sm font-medium">
                                Dyke Supplier Matching
                            </div>
                            <div className="rounded-lg border">
                                <div className="grid grid-cols-4 gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    <span>Dyke Supplier</span>
                                    <span>Dyke UID</span>
                                    <span>Matched Inventory Supplier</span>
                                    <span>Status</span>
                                </div>
                                <div className="divide-y">
                                    {supplierReviewQuery.data.map((row) => (
                                        <div
                                            key={`${row.dykeSupplierId}`}
                                            className="grid grid-cols-4 gap-3 px-4 py-3 text-sm"
                                        >
                                            <span>{row.dykeName || "-"}</span>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {row.dykeUid || "-"}
                                            </span>
                                            <span>{row.supplierName || "-"}</span>
                                            <span
                                                className={
                                                    row.matched
                                                        ? "text-emerald-600"
                                                        : "text-amber-600"
                                                }
                                            >
                                                {row.matched ? "Matched" : "Needs UID match"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
