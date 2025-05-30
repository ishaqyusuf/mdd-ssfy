import { generateRandomString } from "@/lib/utils";
import { parseAsBoolean, parseAsJson, useQueryStates } from "nuqs";

export function useLaborCostModal() {
    const [params, setParams] = useQueryStates({
        laborCostModal: parseAsBoolean,
        costUpdate: parseAsJson<{
            id: number;
            rate: number;
        }>(),
    });

    return {
        params,
        setParams,
    };
}
