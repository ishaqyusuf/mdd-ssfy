import { parseAsBoolean, parseAsJson, useQueryStates } from "nuqs";
import { z } from "zod";

export function useLaborCostModal() {
    const [params, setParams] = useQueryStates({
        laborCostModal: parseAsBoolean,
        costUpdate: parseAsJson(
            z.object({
                id: z.number().optional(),
                rate: z.number().optional(),
            }).parse,
        ),
    });

    return {
        params,
        setParams,
    };
}
