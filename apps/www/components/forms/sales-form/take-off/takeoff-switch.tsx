import DevOnly from "@/_v2/components/common/dev-only";
import Portal from "@/components/_v1/portal";
import { Switch } from "@gnd/ui/switch";

export function TakeoffSwitch({ takeOff, takeOffChanged }) {
    const toggleTakeOff = (e) => {
        takeOffChanged(e);
    };
    return (
        <DevOnly>
            <Portal nodeId={"navRightSlot"}>
                <div>
                    <Switch
                        onCheckedChange={toggleTakeOff}
                        checked={takeOff}
                        id="takeOff"
                    />
                    <label htmlFor="takeOff">Take off</label>
                </div>
            </Portal>
        </DevOnly>
    );
}
