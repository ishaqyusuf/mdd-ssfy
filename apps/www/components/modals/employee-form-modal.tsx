import { useEmployeesParams } from "@/hooks/use-employee-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { employeeFormSchema } from "@api/schemas/hrm";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";
import { z } from "zod";

export function EmployeeFormModal({}) {
    const { setParams, params, opened } = useEmployeesParams();
    const form = useZodForm(employeeFormSchema, {
        defaultValues: {},
    });
    function onSubmit(values: z.infer<typeof employeeFormSchema>) {}
    return (
        <Dialog
            open={opened}
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            <DialogContent
                onOpenAutoFocus={(evt) => evt.preventDefault()}
                className="max-w-[xl]"
            >
                <div className="p-4">
                    <DialogHeader className="mb-4">
                        <DialogTitle>Employee Form</DialogTitle>
                    </DialogHeader>
                </div>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    ></form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

