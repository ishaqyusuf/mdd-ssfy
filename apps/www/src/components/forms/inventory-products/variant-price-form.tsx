import { FormCombobox } from "@/components/common/controls/form-combobox";
import FormInput from "@/components/common/controls/form-input";
import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { updateVariantCostSchema } from "@sales/inventory";
import { useVariant } from "./context";

interface Props {}
export function VariantPriceForm({}: Props) {
    const ctx = useVariant();
    const form = useZodForm(updateVariantCostSchema, {
        defaultValues: {
            variantId: ctx.data?.variantId!,
            // pricingId: ctx?.data?.
            editType: null,
            cost: null,
        },
    });
    const onSubmit = async (data) => {};

    return (
        <Form {...form}>
            <form
                {...form}
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex gap-4"
            >
                <FormInput
                    label="New Cost Price"
                    control={form.control}
                    name="cost"
                />
                <FormCombobox
                    control={form.control}
                    name="editType"
                    comboProps={{
                        items: [""],
                    }}
                    label="Edit Type"
                />
            </form>
        </Form>
    );
}

