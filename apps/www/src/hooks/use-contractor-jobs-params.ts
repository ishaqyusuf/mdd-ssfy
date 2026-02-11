import {
    parseAsBoolean,
    parseAsString,
    useQueryStates,
    parseAsInteger,
} from "nuqs";

export function useJobParams(options?: { shallow: boolean }) {
    const [params, setParams] = useQueryStates(
        {
            openJobId: parseAsInteger,
        },
        options,
    );
    const opened = !!params.openJobId;
    return {
        ...params,
        setParams,
        opened,
    };
}

