import { useCallback, useContext } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { useRouter } from "next/navigation";
import usePersistDirtyForm from "@/_v2/hooks/use-persist-dirty-form";
import { resetSalesStatAction } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-stat-control.action";
import { SalesOrderItems, SalesOrders } from "@/db";
import { isProdClient } from "@/lib/is-prod";
import { numeric, toFixed } from "@/lib/use-number";
import { removeEmptyValues } from "@/lib/utils";
import { SaveOrderActionProps } from "@/types/sales";
import debounce from "debounce";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import useDeepCompareEffect from "use-deep-compare-effect";

import { saveSaleAction } from "../../_actions/save-sales.action";
import { SalesFormContext } from "../ctx";
import salesFormUtils from "../sales-form-utils";
import { ISalesForm } from "../type";

export default function useSaveSalesHook() {
    const form = useFormContext<ISalesForm>();
    const watchForm = form.watch();
    const [saving, startTransaction] = useTransition();
    const ctx = useContext(SalesFormContext);

    usePersistDirtyForm();
    async function submit(
        and: "close" | "new" | "default" = "default",
        autoSave = false,
        data: any = null,
    ) {
        startTransaction(async () => {
            let _data = formData(
                !data ? form.getValues() : data,
                ctx.data.paidAmount,
            );

            if (!_data.id && autoSave) return;
            // if (autoSave && _data.items?.length < 2) {

            //     return;
            // }
            _data.autoSave = autoSave;

            if (_data.order.type == "order") {
                _data.order.paymentDueDate =
                    salesFormUtils._calculatePaymentTerm(
                        _data.order.paymentTerm,
                        _data.order.createdAt,
                    );
            }
            const order = await saveSaleAction(
                _data.id,
                _data.order,
                _data.items,
            );
            await resetSalesStatAction(order.id);
            switch (and) {
                case "close":
                    router.push(`/sales/${order.type}s`);
                    break;
                case "new":
                    router.push(`/sales/edit/${order.type}/new`);
                    break;
                case "default":
                    if (!ctx.data.form.id)
                        router.push(`/sales/edit/${order.type}/${order.slug}`, {
                            // shallow: true,
                        });
                    break;
            }
            if (!autoSave || (autoSave && !isProdClient)) {
                toast.success("Saved");
            }
            form.reset(
                {},
                {
                    keepValues: true,
                    keepDirty: false,
                    keepSubmitCount: true,
                },
            );
            // form.formState.
        });
    }
    async function save(
        and: "close" | "new" | "default" = "default",
        autoSave = false,
        data: any = null,
    ) {
        setTimeout(() => {
            form.handleSubmit(() => submit(and, autoSave, data))();
        }, 500);
    }
    const debouncedSave = useCallback(
        debounce(() => {
            form.handleSubmit((d) => {
                if (d.customerId) {
                    submit("default", true, d);
                } else {
                    toast.error(
                        "Autosave paused, requires customer information.",
                    );
                }
            })();
            // methods.handleSubmit(onSubmit)();
        }, 2000),
        [form],
    );
    useDeepCompareEffect(() => {
        if (
            form.formState.isDirty &&
            Object.keys(form.formState.dirtyFields).length
        ) {
            debouncedSave();
        }
    }, [watchForm, form]);
    const router = useRouter();
    return {
        saving,
        save,
    };
}
function formData(data: ISalesForm, paidAmount): SaveOrderActionProps {
    let { _lineSummary, items, id, ...form } = data;
    form.amountDue = +toFixed(Number((form.grandTotal || 0) - paidAmount));
    form.meta = removeEmptyValues(form.meta);
    form.goodUntil = salesFormUtils._calculatePaymentTerm(
        form.paymentTerm,
        form.createdAt,
    );
    const deleteIds: any = [];
    items = items
        .map(({ salesOrderId, _ctx, ...item }, index) => {
            if (!item.description && !item.total) {
                deleteIds.push(item.id);
                return null;
            }
            item.meta.uid = index;
            return numeric<SalesOrderItems>(
                ["qty", "price", "rate", "tax", "taxPercenatage", "total"],
                item,
            );
        })
        .filter(Boolean);
    return {
        id,
        order: numeric<SalesOrders>(
            ["grandTotal", "amountDue", "tax", "taxPercentage", "subTotal"],
            form,
        ) as any,
        deleteIds,
        items,
    };
}
