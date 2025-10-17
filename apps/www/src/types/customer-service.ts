import { Users, WorkOrders } from "@/db";

import { OmitMeta } from "./type";

export interface IWorkOrder extends OmitMeta<WorkOrders> {
    meta: IWorkOrderMeta;
    tech: Users;
}
export interface IWorkOrderMeta {
    signatory;
    lotBlock;
    signature: {
        path;
    };
    comment;
}
