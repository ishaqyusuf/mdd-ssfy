import { parseAsBoolean, parseAsInteger, useQueryStates } from "nuqs";

export function useCommunityTemplateParams() {
    const [params, setParams] = useQueryStates({
        createTemplate: parseAsBoolean,
        templateId: parseAsInteger,
        openCommunityTemplateId: parseAsInteger,
    });

    const opened = !!params.openCommunityTemplateId;
    return {
        ...params,
        setParams,
        opened,
    };
}

