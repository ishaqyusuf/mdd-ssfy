import {
    parseAsBoolean,
    parseAsString,
    useQueryStates,
    parseAsInteger,
} from "nuqs";

export function useCommunityProjectParams(options?: { shallow: boolean }) {
    const [params, setParams] = useQueryStates(
        {
            openCommunityProjectId: parseAsInteger,
        },
        options,
    );
    const opened = !!params.openCommunityProjectId;
    return {
        ...params,
        setParams,
        opened,
    };
}

