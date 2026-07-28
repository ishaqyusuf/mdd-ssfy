import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import {
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    useQueryStates,
} from "nuqs";
import { z } from "zod";

const returnToUnitInvoiceSchema = z.object({
    editUnitInvoiceId: z.number(),
});

export function useCommunityModelCostParams() {
    const { setParams: setUnitInvoiceParams } = useUnitInvoiceParams();
    const [params, setParams] = useQueryStates({
        createModelCost: parseAsBoolean,
        editModelCostTemplateId: parseAsInteger,
        editModelCostId: parseAsInteger,
        returnToUnitInvoice: parseAsJson(returnToUnitInvoiceSchema.parse),
    });

    const onClose = () => {
        const nextUnitInvoicePayload = params.returnToUnitInvoice;
        setParams(null).then(() => {
            if (
                nextUnitInvoicePayload &&
                typeof nextUnitInvoicePayload === "object"
            ) {
                setUnitInvoiceParams(nextUnitInvoicePayload);
            }
        });
    };

    return {
        ...params,
        setParams,
        onClose,
    };
}
