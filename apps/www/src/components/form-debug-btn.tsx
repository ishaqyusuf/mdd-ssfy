import { useFormContext } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Env } from "@/components/env";
import { toast } from "@gnd/ui/use-toast";
import { debugToast } from "@/hooks/use-debug-console";

export function FormDebugBtn({ title = null }) {
    const { trigger, formState } = useFormContext();

    return (
        <Env isDev>
            <div className="px-4">
                <Button
                    type="button"
                    onClick={() => {
                        trigger().then((e) => {
                            if (e)
                                toast({
                                    title: "Sucess",
                                    variant: "success",
                                });
                            else {
                                const { errors } = formState;
                                debugToast(title, errors);
                            }
                        });
                    }}
                >
                    Debug Submit
                </Button>
            </div>
        </Env>
    );
}
