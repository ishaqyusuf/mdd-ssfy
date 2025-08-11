import { createContextFactory } from "@/utils/context-factory";
import { useAuth } from "./use-auth";
import { getLinkModules, validateLinks } from "@/components/sidebar/links";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

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
        const activeLink = useMemo(() => {
            const active = Object.entries(linkModules.linksNameMap || {}).find(
                ([href, data]) =>
                    data.match == "part"
                        ? pathName?.toLocaleLowerCase()?.startsWith(href)
                        : href?.toLocaleLowerCase() ===
                          pathName?.toLocaleLowerCase(),
            )?.["1"];
            return active;
        }, [pathName, linkModules]);
        return {
            linkModules,
            activeLink,
            isExpanded,
            onSelect,
        };
    });

