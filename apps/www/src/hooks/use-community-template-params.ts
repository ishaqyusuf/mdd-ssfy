import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useCommunityTemplateParams() {
    const [params, setParams] = useQueryStates({
        createTemplate: parseAsBoolean,
        templateId: parseAsInteger,
    });

    return {
        ...params,
        setParams,
    };
}

