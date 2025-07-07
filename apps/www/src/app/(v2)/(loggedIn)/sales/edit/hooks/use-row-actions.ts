import salesFormUtils from "../sales-form-utils";
import { useContext } from "react";
import { SalesFormContext, SalesRowContext } from "../ctx";
import { ISalesOrder } from "@/types/sales";
import { useFormContext } from "react-hook-form";

export default function useSalesInvoiceRowActions(index, id, field) {
    const form = useFormContext<ISalesOrder>();

    const { remove, insert, update, move } = useContext(SalesRowContext);
    const { setSummary } = useContext(SalesFormContext);
    return {
        clear() {
            const ne = salesFormUtils.generateInvoiceItem({
                meta: {},
                _ctx: {
                    id,
                },
            });
            update(index, ne);
        },
        remove() {
            remove(index);
            setSummary((s) => {
                let newSummary = { ...s };
                delete newSummary[id];
                return newSummary;
            });
        },
        copy() {
            // const {id, ...rest} = field;
            // setTimeout(() => {
            // console.log(field.qty);
            const data = form.getValues(`items.${index}`);
            // console.log(data);
            const newData = salesFormUtils.copySalesItem(data);
            insert(index + 1, newData as any);
            // }, 2000);
        },
        addLine(where: "before" | "after") {
            let pos = where == "before" ? 0 : 1;
            const newData = salesFormUtils.generateInvoiceItem();
            insert(index + pos, newData as any);
        },
        move(toIndex) {
            move(index, toIndex);
        },
    };
}
