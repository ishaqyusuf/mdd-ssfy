import { useQueryStates } from "nuqs";
import {
    createLoader,
    parseAsArrayOf,
    parseAsString,
    parseAsBoolean,
    parseAsInteger,
    parseAsStringEnum,
} from "nuqs/server";

export const modelTemplatePrintFilterParamsSchema = {
    preview: parseAsBoolean,
    homeIds: parseAsArrayOf(parseAsInteger),
    version: parseAsStringEnum(["v1", "v2"]),
    templateSlug: parseAsString,
};

export function useModelTemplatePrintFilterParams() {
    const [filters, setFilters] = useQueryStates(
        modelTemplatePrintFilterParamsSchema
    );

    return {
        filters,
        setFilters,
    };
}
export const loadModelTemplatePrintFilterParams = createLoader(
    modelTemplatePrintFilterParamsSchema
);

