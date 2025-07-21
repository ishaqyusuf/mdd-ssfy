import { useFormContext } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Env } from "@/components/env";

export function FormDebugBtn({}) {
    const { trigger, formState } = useFormContext();

    return (
        <Env isDev>
            <div className="px-4">
                <Button
                    type="button"
                    onClick={() => {
                        trigger().then((e) => {});
                    }}
                >
                    Debug Submit
                </Button>
            </div>
        </Env>
    );
}
