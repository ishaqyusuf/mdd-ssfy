import { useFormContext } from "react-hook-form";

import { FormDebugBtn } from "./form-debug-btn";
import { SubmitButton } from "./submit-button";
import { ButtonProps } from "@gnd/ui/button";

interface Props {
    action;
    label?;
    noDebug?: boolean;
    More?;
    size?: ButtonProps["size"];
}
export function FormActionButton({
    action,
    noDebug,
    More,
    size,
    label = "Submit",
}: Props) {
    const { handleSubmit } = useFormContext();
    return (
        <form className="grid gap-4" onSubmit={handleSubmit(action.execute)}>
            <div className="flex justify-end">
                {noDebug || <FormDebugBtn />}
                <div className="flex">
                    <SubmitButton
                        size={size}
                        isSubmitting={action?.isExecuting}
                    >
                        {label}
                    </SubmitButton>
                </div>
            </div>
        </form>
    );
}
