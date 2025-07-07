import { ISalesOrder, ISalesOrderItem } from "@/types/sales";

export interface ISalesForm extends Omit<ISalesOrder, "items"> {
    _lineSummary: {
        [uid in string]: {
            tax: number | undefined;
            total: number | undefined;
            id;
        };
    };
    items: ISalesFormItem[];
}

export interface ISalesFormItem extends ISalesOrderItem {
    _ctx?: {
        id: string;
        tax;
        total;
    };
}
