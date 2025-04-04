import DevOnly from "@/_v2/components/common/dev-only";

import { Button } from "@gnd/ui/button";

import {
    bootstrapDykeStepDuplicates,
    bootstrapHousePackageTools,
} from "./actions";
import { setStepsUids } from "./set-step-uids";

export default function Bootstrap() {
    return (
        <DevOnly>
            <Button
                onClick={async () => {
                    console.log(await bootstrapDykeStepDuplicates());
                }}
            >
                Bootstrap housepackage tools
            </Button>
        </DevOnly>
    );
}
