import { FormCombobox } from "@/components/common/controls/form-combobox";
import FormInput from "@/components/common/controls/form-input";
import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { UpdateVariantCost, updateVariantCostSchema } from "@sales/inventory";
import { useVariant } from "./context";
import { SubmitButton } from "@/components/submit-button";
import { PRICE_UPDATE_SOURCE_OPTIONS } from "@sales/constants";
import { useAuth } from "@/hooks/use-auth";
import { selectOptions } from "@gnd/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { toast } from "@gnd/ui/use-toast";
import { useDebugConsole } from "@/hooks/use-debug-console";

interface Props {}
export function VariantPriceForm({}: Props) {
    const ctx = useVariant();
    const auth = useAuth();
    const defaultValues = {
        variantId: ctx.data?.variantId!,
        editType: "manual update",
        cost: "" as any,
        effectiveFrom: new Date().toISOString(),
        effectiveTo: null,
        attributes: ctx.data.attributes,
        inventoryId: ctx.data.inventoryId,
        authorName: auth.name,
        oldCostPrice: ctx.data.price,
        reason: "",
        pricingId: ctx.data.pricingId,
    } satisfies UpdateVariantCost;

    const form = useZodForm(updateVariantCostSchema, {
        defaultValues,
    });
    const inv = useInventoryTrpc();
    const trpc = useTRPC();
    const { mutate, error } = useMutation(
        trpc.inventories.updateVariantCost.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Updated!",
                });
                form.reset(defaultValues);
                inv.refreshKeys(
                    "inventoryVariantStockForm",
                    "inventoryProducts",
                );
            },
            onError(error, variables, context) {
                toast({
                    title: "Unable to complete!",
                });
            },
        }),
    );
    useDebugConsole(error);
    const onSubmit = async (data) => {
        mutate(data);
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid sm:grid-cols-2 gap-4 w-full"
            >
                <FormInput
                    label="New Cost Price"
                    control={form.control}
                    name="cost"
                    type="number"
                    numericProps={{
                        prefix: "USD ",
                        placeholder: "USD 0",
                    }}
                    className="flex-1"
                />
                <FormCombobox
                    control={form.control}
                    name="editType"
                    comboProps={{
                        items: selectOptions(
                            PRICE_UPDATE_SOURCE_OPTIONS,
                            "label",
                            "value",
                        ),
                    }}
                    label="Source"
                    className="flex-1"
                />
                <FormInput
                    label="Reason for Change"
                    control={form.control}
                    name="reason"
                    type="textarea"
                    className="col-span-2"
                    placeholder="Optional reason for the price change..."
                />
                <div className="col-span-2 flex justify-end">
                    <SubmitButton
                        isSubmitting={undefined}
                        formAction={onSubmit}
                    >
                        Update
                    </SubmitButton>
                </div>
            </form>
        </Form>
    );
}

