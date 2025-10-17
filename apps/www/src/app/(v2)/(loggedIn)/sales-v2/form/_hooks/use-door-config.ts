import { isComponentType } from "../../overview/is-component-type";
import { DykeDoorType } from "../../type";

export default function getDoorConfig(doorType: DykeDoorType) {
    const ct = isComponentType(doorType);

    const ctx = {
        doorType,
        multiPrice: ct.bifold || ct.slab,
        singleHandle: ct.bifold || ct.slab || ct.service,
    };

    return ctx;
}
