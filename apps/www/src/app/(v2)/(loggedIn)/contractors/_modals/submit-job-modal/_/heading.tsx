import { Icons } from "@/components/_v1/icons";

import { Button } from "@gnd/ui/button";

import { SubmitJobModalProps, useSubmitJobForm } from ".";
import useSubmitJob, { useJobSubmitCtx } from "./use-submit-job";

export function SubmitJobModalTitle({ data }: SubmitJobModalProps) {
    const ctx = useJobSubmitCtx();
    function goBack() {
        const [tab1, ...tabs] = ctx.tabHistory.fields;
        ctx.tabHistory.remove(0);
        ctx.form.setValue("tab", (tab1 as any)?.title);
    }
    return (
        <div className="flex items-center space-x-2">
            {ctx.tabHistory.fields.length > 0 && (
                <Button
                    variant={"ghost"}
                    className="h-8 w-8 p-0"
                    onClick={goBack}
                >
                    <Icons.arrowLeft className="h-4 w-4" />
                </Button>
            )}

            {
                {
                    user: "Select Employee",
                    project: "Select Project",
                    unit: "Select Unit",
                    tasks: "Task Information",
                    general: "Other Information",
                }[ctx.tab]
            }
        </div>
    );
}
export function SubmitJobModalSubtitle({ data }: SubmitJobModalProps) {
    const ctx = useJobSubmitCtx();

    if (ctx.id && data?.data?.subtitle)
        return <div>{data?.data?.subtitle}</div>;
}
