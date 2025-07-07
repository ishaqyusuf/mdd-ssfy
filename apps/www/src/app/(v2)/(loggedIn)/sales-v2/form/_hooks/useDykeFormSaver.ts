import { useTransition } from "react";
import { DykeForm, SaveMode } from "../../type";
import { useRouter, useSearchParams } from "next/navigation";
import { saveDykeSales } from "../_action/save-dyke";
import { toast } from "sonner";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { _saveDykeError, errorRestored } from "../_action/error/save-error";
import initDykeSaving from "../../_utils/init-dyke-saving";
import salesFormUtils from "../../../sales/edit/sales-form-utils";

export default function useDykeFormSaver(form) {
    const [saving, startTransition] = useTransition();
    const router = useRouter();
    const [orderId, id, type] = form.getValues([
        "order.orderId",
        "order.id",
        "order.type",
    ]);
    const params = useSearchParams();

    function save(
        data: DykeForm,
        mode: SaveMode = "default",
        onComplete = null
    ) {
        const errorId = params.get("errorId");
        startTransition(async () => {
            const errorData: any = {
                data,
                errorId,
            };
            try {
                // const estimate = calculateFooterEstimate(data, null);
                const e = initDykeSaving(data);
                // console.log(e);

                if (e.order.type == "order") {
                    e.order.paymentDueDate =
                        salesFormUtils._calculatePaymentTerm(
                            e.order.paymentTerm,
                            e.order.createdAt
                        );
                    const { paymentDueDate, paymentTerm, createdAt } = e.order;
                }
                // console.log({ error: e?.order?.customer });
                // console.log(e._taxForm.taxByCode);
                // console.log(e);

                // return;
                const { order: resp } = await saveDykeSales(e);
                errorData.response = resp;
                toast.success("Saved!");
                if (errorId) await errorRestored(errorId);
                switch (mode) {
                    case "close":
                        router.push(
                            data.dealerMode
                                ? `/${resp.type}s`
                                : type == "order"
                                ? `/sales-book/${type}s`
                                : `/sales/${type}s`
                        );
                        break;
                    case "default":
                        if (!id || params.get("restore") == "true")
                            router.push(
                                data.dealerMode
                                    ? `/sales-form/${resp.type}/${resp.slug}`
                                    : `/sales-v2/form/${resp.type}/${resp.slug}`
                            );
                        else await _revalidate("salesV2Form");
                        break;
                    case "new":
                        router.push(
                            data.dealerMode
                                ? `/create-quote`
                                : `/sales-book/create-${resp.type}`
                        );
                        break;
                }
                await onComplete?.();
            } catch (error) {
                toast.error("Something went wrong");
                if (error instanceof Error) {
                    console.log(error.message);
                    errorData.message = error.message;
                }
                if (!errorId)
                    await _saveDykeError(errorData.errorId, errorData);
            }
        });
    }

    return {
        saving,
        save,
    };
}
