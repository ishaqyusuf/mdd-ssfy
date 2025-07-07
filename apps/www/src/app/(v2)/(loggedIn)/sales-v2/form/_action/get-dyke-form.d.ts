import { DykeDoorType } from "../../type";
import { ISalesType, SalesStatus } from "@/types/sales";
export declare function getDykeFormAction(type: ISalesType, slug: any, query?: any): Promise<{
    salesRep: any;
    customer: any;
    dealerMode: any;
    superAdmin: boolean;
    adminMode: boolean;
    shippingAddress: any;
    billingAddress: any;
    salesProfile: any;
    order: any;
    _rawData: any;
    itemArray: any;
    data: any;
    _taxForm: any;
    paidAmount: any;
    footer: {
        footerPrices: string;
        footerPricesJson: {
            [x: string]: {
                doorType: DykeDoorType;
                price: number;
                tax?: boolean;
            };
        };
    };
    _refresher: {
        [x: string]: {
            components: string;
        };
    };
    batchSetting: {
        [x: string]: {
            selections: { [token in string]: boolean; };
        };
    };
    status: SalesStatus;
}>;
