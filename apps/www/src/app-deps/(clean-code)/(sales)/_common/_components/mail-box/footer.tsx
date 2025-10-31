import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";

import { Form } from "@gnd/ui/form";

import { useMailbox } from "./context";

export function MailboxFooter({}) {
    const { form, data, __sendEmail } = useMailbox();
    return (
        <Form {...form}>
            <div className="absolute bottom-0 z-10 flex w-full flex-col gap-4 border-t bg-white p-2 sm:p-4">
                <FormInput
                    placeholder="Subject"
                    control={form.control}
                    name="subject"
                    className=""
                />
                <FormInput
                    placeholder="type here"
                    type="textarea"
                    control={form.control}
                    name="body"
                    className=""
                />
                <div className="flex">
                    {/* <FormCheckbox control={form.control}
                    name="attachment" /> */}
                    <FormSelect
                        name="attachment"
                        size="sm"
                        className="w-48"
                        prefix="Attachment"
                        control={form.control}
                        placeholder={"Attachment"}
                        valueKey={"label" as any}
                        titleKey={"label" as any}
                        options={[
                            // "Payment Invoice",
                            { label: "None" },
                            ...data.attachables,
                        ]}
                    />
                    <div className="flex-1"></div>
                    <Button
                        action={__sendEmail}
                        disabled={data?.noEmail}
                        size="sm"
                    >
                        Send
                    </Button>
                </div>
            </div>
        </Form>
    );
}
