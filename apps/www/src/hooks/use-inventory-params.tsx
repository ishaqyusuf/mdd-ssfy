import { CamelCaseType } from "@gnd/utils/types";
import { InventoryForm } from "@sales/schema";
import {
    createLoader,
    parseAsInteger,
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

const modes = ["community-section"] as const;
const inventoryParamsSchema = {
    productId: parseAsInteger,
    editVariantUid: parseAsString,
    editVariantTab: parseAsStringEnum(["pricing", "stock", "overview"]),
    mode: parseAsStringEnum([...modes]),
    defaultValues: parseAsJson<InventoryForm>(undefined),
};

export function useInventoryParams() {
    const [params, setParams] = useQueryStates(inventoryParamsSchema);
    type Mode = {
        [K in CamelCaseType<(typeof modes)[number]>]: boolean;
    };
    const _mode = Object.fromEntries(
        modes.map((val) => {
            const key = val
                .split("-")
                .map((p, i) =>
                    i === 0
                        ? p.toLowerCase()
                        : p.charAt(0).toUpperCase() + p.slice(1),
                )
                .join("");
            return [key, params.mode === val];
        }),
    ) as Mode;
    return {
        ...params,
        setParams,
        _mode,
    };
}

export const loadInventoryParams = createLoader(inventoryParamsSchema);

