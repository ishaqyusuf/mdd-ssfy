"use client";

import dynamic from "next/dynamic";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

interface CmdContext {
    getActions: (path: string) => any[];
    registerActions: (path: string, actions: any[]) => void;
}
const cmdContext = createContext<CmdContext>({} as any);
const Cmd = dynamic(() => import(".").then((mod) => mod.Cmd), {
    loading: () => null,
});

export const CommandProvider = ({ children }) => {
    const actionsRef = useRef<Record<string, any[]>>({});
    const path = usePathname();
    const route = useRouter();
    const [open, setOpen] = useState(false);
    const [specialCmds, setSpecialCmds] = useState<any[]>([]);

    const registerActions = useCallback((path: string, actions: any[]) => {
        actionsRef.current[path] = actions;
    }, []);

    const getActions = useCallback((path: string) => {
        return actionsRef.current[path] || [];
    }, []);

    const value = useMemo(
        () => ({
            getActions,
            registerActions,
        }),
        [getActions, registerActions],
    );

    useEffect(() => {
        const down = (event: KeyboardEvent) => {
            const metaKey = event.metaKey || event.altKey;

            if (metaKey) {
                switch (event.key) {
                    case "o":
                        event.preventDefault();
                        route.push("/sales/edit/order/new");
                        break;
                    case "e":
                        event.preventDefault();
                        route.push("/sales/edit/quote/new");
                        break;
                }
            }

            if (event.key === "k" && metaKey) {
                event.preventDefault();
                setSpecialCmds(getActions(path));
                setOpen((current) => !current);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [getActions, path, route]);

    return (
        <cmdContext.Provider value={value}>
            {children}
            {open ? (
                <Cmd
                    open={open}
                    onOpenChange={setOpen}
                    specialCmds={specialCmds}
                />
            ) : null}
        </cmdContext.Provider>
    );
};
export function useCmd(actions?) {
    const cmd = useContext<CmdContext>(cmdContext);
    const path = usePathname();

    useEffect(() => {
        if (actions) {
            cmd.registerActions(path, actions);
        }
    }, [actions, cmd, path]);

    return {
        ...cmd,
    };
}
