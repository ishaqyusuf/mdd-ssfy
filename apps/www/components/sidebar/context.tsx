import { timeout } from "@/lib/timeout";
import { createContextFactory } from "@/utils/context-factory";
import z from "zod";

import { useSidebar as useBaseSidebar } from "@gnd/ui/sidebar";

import { useSidebarStore } from "./store";
import { getLinkModules } from "./links";

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
    ) {
        const store = useSidebarStore();
        const data = store;
        const { isMobile } = useBaseSidebar();
        const loader = async () => {
            await timeout(100);
        };

        return {
            data,
            isMobile,
            form: {
                setValue: store.update,
            },
            linkModules,
        };
    });
export { useSidebar, SidebarContext };

export const { useContext: useSidebarModule, Provider: SideBarModuleProvider } =
    createContextFactory(function (name) {
        const ctx = useSidebar();
        const store = useSidebarStore();
        // ctx.isMobile;
        // const module = ctx?.data?.siteModules?.[name];

        const siteModule = store.siteModules?.[name];
        const isCurrentModule = ctx.data?.activeModule == name;
        // ctx.isMobile;
        // const module = ctx?.data?.siteModules?.[name];
        //  ctx.form.watch(`siteModules.${name}`);
        // const data = useAsyncMemo(loader, []);
        return { siteModule, isCurrentModule };
    });

export const {
    useContext: useSidebarSection,
    Provider: SideBarSectionProvider,
} = createContextFactory(function (name) {
    const ctx = useSidebar();
    // const module = ctx?.data?.siteModules?.[name];
    // const module = ctx.form.watch(`siteModules.${name}` as any);
    // const data = useAsyncMemo(loader, []);
    return {
        // module
        name,
    };
});
export const { useContext: useSidebarLink, Provider: SideBarLinkProvider } =
    createContextFactory(function (name) {
        const ctx = useSidebar();
        // const module = ctx?.data?.siteModules?.[name];
        // const module = ctx.form.watch(`siteModules.${name}` as any);
        // const data = useAsyncMemo(loader, []);
        return {
            // module
            name,
        };
    });
