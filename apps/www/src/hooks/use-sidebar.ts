import { createContextFactory } from "@/utils/context-factory";
import { useAuth } from "./use-auth";
import { getLinkModules, validateLinks } from "@/components/sidebar/links";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface Props {
    isExpanded: boolean;
    onSelect?: () => void;
}
export const { Provider: MainMenuProvider, useContext: useMainNav } =
    createContextFactory(({ isExpanded, onSelect }: Props) => {
        const user = useAuth();
        const linkModules = getLinkModules(
            validateLinks({
                role: user.role,
                can: user.can,
                userId: user?.id,
            }),
        );
        const pathName = usePathname();
        const ctx = useMemo(() => {
            console.log({ pathName });
        }, [pathName]);
        const [activeLink, setActiveLink] = useState<{ name?; module? }>({});
        // useEffect(() => {
        //     const active = Object.entries(linkModules.linksNameMap || {}).find(
        //         ([href, data]) =>
        //             data.match == "part"
        //                 ? pathName?.toLocaleLowerCase()?.startsWith(href)
        //                 : href?.toLocaleLowerCase() ===
        //                   pathName?.toLocaleLowerCase(),
        //     )?.["1"];
        //     // console.log({ active, pathName, linkModules });
        //     setActiveLink(active || {});
        // }, [pathName, linkModules]);
        return {
            linkModules,
            activeLink,
            isExpanded,
            onSelect,
        };
    });

