import createContextFactory from "@/utils/context-factory";
import { useAuth } from "./use-auth";
import {
    getActiveLinkFromMap,
    getLinkModules,
    validateLinks,
} from "@/components/sidebar/links";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export const { Provider: SidebarProvider, useContext: useSidebar } =
    createContextFactory(({ onSelect = null, mobile = false }) => {
        const [isExpanded, setIsExpanded] = useState(mobile ? true : false);
        const mainMenuRef = useRef<HTMLDivElement>(null);
        useEffect(() => {
            if (mobile) return;
            if (!isExpanded && mainMenuRef.current) {
                (mainMenuRef.current as any).scrollTop = 0;
            }
        }, [isExpanded, mobile]);
        const linkModules = useLinks();
        // linkModules.moduleLinksCount

        const pathName = usePathname();
        const { activeLink, modules, currentModule } = useMemo(() => {
            const activeLink = getActiveLinkFromMap(
                pathName,
                linkModules.linksNameMap
            );
            const modules = linkModules?.modules
                ?.filter((a) => a.activeLinkCount && a?.name)
                .map((module) => {
                    const prim = module?.sections
                        ?.map((a) => a.links?.filter((l) => l.show))
                        ?.flat()
                        ?.sort((a, b) => a.globalIndex - b.globalIndex)?.[0];
                    const href =
                        module.defaultLink ||
                        prim?.href ||
                        prim?.subLinks?.filter((a) => a.show)?.[0]?.href;
                    return {
                        ...module,
                        href,
                    };
                });
            const currentModule = modules.find(
                (m) => m.name == activeLink?.module
            );

            return { activeLink, modules, currentModule };
        }, [pathName, linkModules]);

        return {
            isExpanded,
            isMobile: mobile,
            // setIsExpanded: (a) => {},
            setIsExpanded,
            mainMenuRef,
            linkModules,
            activeLink,
            onSelect,
            modules,
            currentModule,
            // isExpanded,
            // onSelect,
        };
    });

export function useLinks() {
    const user = useAuth();
    const linkModules = getLinkModules(
        validateLinks({
            role: user.role?.name,
            can: user.can,
            userId: user?.id,
        })
    );
    return linkModules;
}
