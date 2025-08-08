import { useEffect } from "react";

export function useDebugConsole(...deps) {
    useEffect(() => {
        console.log({
            ...deps,
        });
    }, deps);
}

