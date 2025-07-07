import { ISalesFormItem } from "@/app/(v2)/(loggedIn)/sales/edit/type";
import { SaveOrderActionProps } from "@/types/sales";
declare const _default: {
    _calculatePaymentTerm: typeof _calculatePaymentTerm;
    calibrateLines: typeof calibrateLines;
    formData: typeof formData;
    generateInvoiceItem: typeof generateInvoiceItem;
    initInvoiceItems: typeof initInvoiceItems;
    moreInvoiceLines: typeof moreInvoiceLines;
    newInvoiceLine: typeof newInvoiceLine;
    copySalesItem: typeof copySalesItem;
    taxxable(taxxable: any): boolean;
};
export default _default;
declare function copySalesItem(item: any): any;
declare function formData(data: any, paidAmount: any): SaveOrderActionProps;
declare function _calculatePaymentTerm(paymentTerm: any, createdAt: any): any;
declare function initInvoiceItems(items: ISalesFormItem[] | undefined): {
    _items: ISalesFormItem[];
    footer: any;
};
declare function generateInvoiceItem(baseItem?: any): ISalesFormItem;
declare function newInvoiceLine(toIndex: any, fields: ISalesFormItem[]): ISalesFormItem[];
export declare function moreInvoiceLines(): any[];
declare function calibrateLines(fields: any): ISalesFormItem[];
