import { parseAsString, useQueryStates } from "nuqs";

export function useDebuggerParams() {
    const [params, setParams] = useQueryStates({
        debugTitle: parseAsString,
        debugContent: parseAsString,
    });
    return {
        setParams,
        debugContent: params.debugContent,
        debugTitle: params.debugTitle,
        opened: !!params.debugTitle && !!params.debugContent,
        open(title, content) {
            setParams({
                debugTitle: title,
                debugContent: content,
            });
        },
    };
}

