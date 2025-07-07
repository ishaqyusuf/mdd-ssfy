import { DykeDoorType } from "../type";
export declare function isComponentType(type: DykeDoorType): {
    slab: boolean;
    bifold: boolean;
    service: boolean;
    garage: boolean;
    shelf: boolean;
    exterior: boolean;
    interior: boolean;
    moulding: boolean;
    hasSwing: boolean;
    multiHandles: boolean;
};
