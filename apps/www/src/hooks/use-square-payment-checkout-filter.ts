import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { inboundFilterParamsSchema } from "./use-inbound-filter-params";
import { useQueryStates } from "nuqs";

export const squarePaymentCheckoutFilterSchema = {
    uid: parseAsString,
    tok: parseAsString,
    slugs: parseAsArrayOf(parseAsString),
};

export function useSquarePaymentCheckoutFilterParams() {
    const [params, setParams] = useQueryStates(
        squarePaymentCheckoutFilterSchema,
    );
    return {
        params,
        setParams,
    };
}

export const loadSquarePaymentCheckoutFilterParams = createLoader(
    inboundFilterParamsSchema,
);

