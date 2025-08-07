import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormSelect from "../common/controls/form-select";
import { Button } from "@gnd/ui/button";
import FormInput from "../common/controls/form-input";
import { useSalesQuickPay } from "@/hooks/use-sales-quick-pay";
import { CustomModalPortal } from "../modals/custom-modal";

const schema = z.object({
    paymentMethod: z.string(),
    amount: z.number(),
    checkNo: z.string(),
    terminal: z.string(),
});
interface Props {}
export function SalesQuickPayment({}: Props) {
    const qpCtx = useSalesQuickPay();
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
                        <CustomModalPortal>
                            <Button
                                disabled
                                className="w-full"
                                onClick={(e) => {}}
                            >
                                Apply Payment
                            </Button>
                        </CustomModalPortal>
                    </form>
                </Form>
            </div>
        </div>
    );
}

