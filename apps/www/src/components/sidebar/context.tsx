import { timeout } from "@/lib/timeout";
import { createContextFactory } from "@/utils/context-factory";
import z from "zod";

import { SidebarProvider, useSidebar as useBaseSidebar } from "@gnd/ui/sidebar";

import { useSidebarStore } from "./store";
import { getLinkModules } from "./links";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const schema = z.object({
    render: z.boolean(),
    siteModules: z
        .record(
            z.object({
                name: z.string(),
                title: z.string(),
                subtitle: z.string(),
                icon: z.string(),
                index: z.number(),
                // globalIndex: z.number(),
                // visibleLinkCount
            }),
        )
        .default({}),
    activeLinkName: z.string(),
    activeModule: z.string(),
    // {[id in string]: z.object{}}
    subLinks: z
        .record(
            z.object({
                name: z.string(),
                url: z.string(),
                title: z.string(),
                custom: z.boolean(),
                index: z.number(),
                globalIndex: z.number(),
            }),
        )
        .default({}),
    links: z.record(
        z.object({
            moduleName: z.string(),
            visible: z.boolean(),
            icon: z.string(),
            sectionName: z.string(),
            name: z.string(),
            title: z.string(),
            url: z.string(),
            paths: z.array(z.string()),
            index: z.number(),
            globalIndex: z.number(),
        }),
    ),
});
const { useContext: useSidebar, Provider: SidebarContext } =
    createContextFactory(function (
        linkModules: ReturnType<typeof getLinkModules>,
        user,
    ) {
        const store = useSidebarStore();
        const data = store;
        const { isMobile, state } = useBaseSidebar();

        const pathName = usePathname();
        const [activeLink, setActiveLink] = useState<{ name?; module? }>({});
        useEffect(() => {
            const active = Object.entries(linkModules.linksNameMap || {}).find(
                ([href, data]) =>
                    data.match == "part"
                        ? pathName?.toLocaleLowerCase()?.startsWith(href)
                        : href?.toLocaleLowerCase() ===
                          pathName?.toLocaleLowerCase(),
            )?.["1"];
            setActiveLink(active || {});
        }, [pathName, linkModules]);

        return {
            state,
            data,
            isMobile,
            // form: {
            //     setValue: store.update,
            // },
            linkModules,
            renderMode: linkModules.renderMode,
            activeLink,
            user,
        };
    });
export { useSidebar, SidebarContext };

export const { useContext: useSidebarState, Provider: SidebarStateProvider } =
    createContextFactory(function (_state: "expanded" | "collapsed") {
        const [defaultOpen, setDefaultOpen] = useState(_state == "expanded");

        const [state, setState] = useState(_state);
        return { defaultOpen, setDefaultOpen, state, setState };
    });
export function SidebarProviderRoot({ children, state }) {
    return (
        <SidebarStateProvider args={[state]}>
            <ShadSidebarProvider>{children}</ShadSidebarProvider>
        </SidebarStateProvider>
    );
}
function ShadSidebarProvider({ children }) {
    const { defaultOpen, state } = useSidebarState();

    return (
        <SidebarProvider
            // style={{
            //     "--sidebar-width": "2rem",
            // }}
            // className="fixed"
            open={defaultOpen}
            defaultOpen={defaultOpen}
        >
            {children}
        </SidebarProvider>
    );
}
