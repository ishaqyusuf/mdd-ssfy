import {
    parseAsBoolean,
    parseAsString,
    useQueryStates,
    parseAsInteger,
} from "nuqs";

export function useBuilderParams(options?: { shallow: boolean }) {
    const [params, setParams] = useQueryStates(
        {
            openBuilderId: parseAsInteger,
        },
        options,
    );
    const opened = !!params.openBuilderId;
    return {
        ...params,
        setParams,
        opened,
    };
}

