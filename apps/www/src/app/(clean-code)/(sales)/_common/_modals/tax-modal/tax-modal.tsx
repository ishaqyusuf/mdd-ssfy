import FormInput from "@/components/common/controls/form-input";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import { Taxes } from "@/db";
import { useForm } from "react-hook-form";

import { Form } from "@gnd/ui/form";

import { createTax } from "./action";

interface Props {
    onCreate?(tax: Taxes);
}
export default function TaxModal({ onCreate }: Props) {
    const form = useForm<Taxes>({
        defaultValues: {},
    });
    async function onSubmit() {
        const data = form.getValues();
        const resp = await createTax(data);
        onCreate?.(resp);
        modal.close();
    }
    const modal = useModal();
    return (
        <Modal.Content size="sm">
            <Modal.Header title={"Tax"} />
            <Form {...form}>
                <div className="grid gap-2">
                    <FormInput
                        size="sm"
                        label="Title"
                        control={form.control}
                        name="title"
                    />
                    <FormInput
                        size="sm"
                        label="Percentage"
                        control={form.control}
                        name="percentage"
                    />
                </div>
            </Form>
            <Modal.Footer submitText="Save" onSubmit={onSubmit} />
        </Modal.Content>
    );
}
