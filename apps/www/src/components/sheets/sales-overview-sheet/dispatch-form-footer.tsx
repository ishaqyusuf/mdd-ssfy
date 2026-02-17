import { redirect } from "next/navigation";
import { createSubmissionSchema } from "@/actions/schema";
import { SubmitButton } from "@/components/submit-button";

import { useSession } from "next-auth/react";
import z from "zod";
import { Button } from "@gnd/ui/button";
import { useDispatch } from "./context";
import { useSalesCreateDispatch } from "@/hooks/use-create-sales-dispatch";
type SubmitSchema = z.infer<typeof createSubmissionSchema>;
export function DispatchFormFooter({}) {
    const ctx = useDispatch();
    const { form } = ctx;
    const { openForm, setOpenForm } = ctx;
    const onCancel = () => {
        setOpenForm(false);
    };

    // const form = ctx.form();
    const session = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const { createDispatch } = useSalesCreateDispatch();

    if (!openForm) return null;

    return (
        // <CustomSheetContentPortal>
        <div className="">
            <div className="flex justify-end space-x-2">
                <SubmitButton
                    isSubmitting={ctx?.bachWorker?.executing}
                    type="button"
                    variant="outline"
                >
                    Cancel
                </SubmitButton>
                <Button
                    onClick={(e) => {
                        createDispatch({});
                    }}
                    type="submit"
                >
                    Create Dispatch
                </Button>
            </div>
        </div>
        // </CustomSheetContentPortal>
    );
}
