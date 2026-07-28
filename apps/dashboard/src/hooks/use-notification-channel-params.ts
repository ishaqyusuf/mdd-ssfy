import {
    parseAsBoolean,
    parseAsString,
    useQueryStates,
    parseAsInteger,
} from "nuqs";

export function useNotificationChannelParams(options?: { shallow: boolean }) {
    const [params, setParams] = useQueryStates(
        {
            openNotificationChannelId: parseAsInteger,
        },
        options,
    );
    const opened = !!params.openNotificationChannelId;
    return {
        ...params,
        setParams,
        opened,
    };
}

