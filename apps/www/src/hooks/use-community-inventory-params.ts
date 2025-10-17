import {
    parseAsBoolean,
    parseAsString,
    useQueryStates,
    parseAsInteger,
} from "nuqs";

export function useCommunityInventoryParams(options?: { shallow: boolean }) {
    const [params, setParams] = useQueryStates(
        {
            openCommunityInventoryId: parseAsInteger,
        },
        options,
    );
    const opened = !!params.openCommunityInventoryId;
    return {
        ...params,
        setParams,
        opened,
    };
}

