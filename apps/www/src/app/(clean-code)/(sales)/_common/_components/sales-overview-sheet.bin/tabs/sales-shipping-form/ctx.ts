import { QtyControlByType } from "@/app/(clean-code)/(sales)/types";

export type ItemShippable = {
    pendingAssignmentQty?: number;
    pendingProductionQty?: number;
    deliveryCreatedQty?: number;
    pendingDeliveryQty?: number;
    deliverableQty?: number;
    produceable?: boolean;
    shippable?: boolean;
    qty?: number;
    inputs: {
        label: string;
        available: number;
        total: number;
        delivered: number;
        unavailable: number;
        formKey: string;
    }[];
};
export type SelectionType = {
    [uid in string]: Partial<QtyControlByType["qty"]> & {
        selectionError?: boolean;
        shipInfo: ItemShippable;
    };
};
