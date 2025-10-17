import { Input } from "@gnd/ui/input";
import { useTakeoffItem } from "./context";
import { useState } from "react";
import { Button } from "@gnd/ui/button";
import { createTakeoffTemplate } from "@/actions/create-takeoff-template";
import { useLoadingToast } from "@/hooks/use-loading-toast";

export function TemplateForm({}) {
    const ctx = useTakeoffItem();
    const [title, setTitle] = useState(null);
    const l = useLoadingToast();
    if (!ctx?.openTemplateForm) return null;

    async function createTemplate() {
        l.loading("Saving template");
        const sequence = ctx.zus.sequence.stepComponent?.[ctx.itemUid];
        const template = sequence.map((s) => {
            const t = ctx.zus.kvStepForm?.[s];
            return {
                stepId: t?.stepId,
                componentId: t.componentId,
                componentUid: t.componentUid,
            };
        });
        const invalid = template.filter((a) => a.componentId).length <= 1;
        if (invalid) {
            l.error("Template cannot be empty");
            return;
        }
        await createTakeoffTemplate({
            data: {
                formSteps: template,
            },
            title,
            sectionUid: ctx.section?.componentUid,
        });
        l.success("Saved");
        ctx.refresh();
        ctx.setOpenTemplateForm(false);
    }
    return (
        <div className="flex my-2 justify-end gap-4">
            <Input
                className="h-10 w-56"
                placeholder="Template Title"
                value={title}
                onChange={(e) => {
                    setTitle(e.target.value);
                }}
            />
            <Button
                onClick={(e) => {
                    createTemplate();
                }}
            >
                Save
            </Button>
        </div>
    );
}
