import { useZodForm } from "@/hooks/use-zod-form";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormSelect from "../common/controls/form-select";
import { formatMoney } from "@gnd/utils";
import { Button } from "@gnd/ui/button";
import FormInput from "../common/controls/form-input";

const schema = z.object({
    paymentMethod: z.string(),
    amount: z.number(),
    checkNo: z.string(),
    terminal: z.string(),
});
interface Props {
    salesId;
    amount?;
    opened?;
    setOpened?;
}
export function SalesQuickPayment({
    salesId,
    amount,
    opened,
    setOpened,
}: Props) {
    const form = useZodForm(schema, {});
    async function onSubmit({}) {}
    return (
        <div className="w-[350px]">
            <div>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="grid gap-4 grid-cols-2"
                    >
                        <FormSelect
                            control={form.control}
                            name="paymentMethod"
                            label="Payment Method"
                            size="sm"
                        />
                        <FormInput
                            size="sm"
                            control={form.control}
                            name="amount"
                            label="Amount"
                        />
                        <FormInput
                            control={form.control}
                            name="amount"
                            label="Check No"
                            size="sm"
                        />
                        <FormInput
                            control={form.control}
                            name="amount"
                            label="Terminal"
                            size="sm"
                        />
                        <div className="col-span-2">
                            <Button
                                disabled
                                className="w-full"
                                onClick={(e) => {}}
                            >
                                Apply Payment
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}

