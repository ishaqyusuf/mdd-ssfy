import { useEffect } from "react";

export function useDebugPrint(...deps) {
    useEffect(() => {
        console.log({
            ...deps,
        });
    }, deps);
}
