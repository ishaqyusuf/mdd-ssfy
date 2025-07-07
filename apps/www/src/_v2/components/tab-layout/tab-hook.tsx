import { usePermission } from "@/hooks/use-permission";
import { ICan } from "@/types/auth";
import { useState } from "react";

export function useTab() {
    const permission = usePermission();
    const [tabs, setTabs] = useState<{ title: string; path: string }[]>([]);
    return {
        tabs,
        setTabs,
        ...permission,
        reset() {
            setTabs([]);
        },
        registerTab(title, path, canAccess?: boolean | undefined) {
            const p = canAccess == undefined ? true : canAccess;
            if (p) {
                setTabs((prevTabs) => [...prevTabs, { title, path }]);
            }
        },
    };
}
