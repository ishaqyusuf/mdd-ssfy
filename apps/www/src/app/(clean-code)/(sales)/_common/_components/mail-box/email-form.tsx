import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Form } from "@gnd/ui/form";

import { setSalesCustomerEmailUseCase } from "../../use-case/sales-email-use-case";
import { useMailbox } from "./context";

export default function EmailForm({}) {
    const ctx = useMailbox();
    const form = useForm({
        resolver: zodResolver(
            z.object({
                email: z.string().email(),
            }),
        ),
        defaultValues: {
            email: "",
        },
    });
    async function _saveEmail() {
        const email = form.getValues().email;

        const t = await form.trigger();
        if (t) {
            await setSalesCustomerEmailUseCase(ctx.id, email);

            toast.success("Saved");
            ctx.updateEmail(email);
        } else {
        }
    }
    if (!ctx.data?.noEmail) return null;

    return (
        <Form {...form}>
            <div className="flex justify-center py-10">
                <div className="grid w-1/2 gap-4">
                    <FormInput
                        control={form.control}
                        name="email"
                        label="Email"
                    />
                    <div className="flex justify-end">
                        <Button action={_saveEmail}>Save</Button>
                    </div>
                </div>
            </div>
        </Form>
    );
}
