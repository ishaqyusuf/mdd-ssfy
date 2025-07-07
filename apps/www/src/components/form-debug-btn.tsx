import { useFormContext } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import DevOnly from "@/_v2/components/common/dev-only";

export function FormDebugBtn({}) {
    const { trigger, formState } = useFormContext();

    return (
        <DevOnly>
            <div className="px-4">
                <Button
                    type="button"
                    onClick={() => {
                        trigger().then((e) => {
                            console.log(formState);
                            console.log(formState.errors);
                        });
                    }}
                >
                    Debug Submit
                </Button>
            </div>
        </DevOnly>
    );
}

