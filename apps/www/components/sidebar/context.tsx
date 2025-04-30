import { timeout } from "@/lib/timeout";
import { createContextFactory } from "@/utils/context-factory";
import { useForm } from "react-hook-form";
import z from "zod";

import { useSidebar as useBaseSidebar } from "@gnd/ui/sidebar";

import { useSidebarStore } from "./store";

export const schema = z.object({
    render: z.boolean(),
    siteModules: z
        .record(
            z.object({
                name: z.string(),
                title: z.string(),
                subtitle: z.string(),
                icon: z.string(),
                // visibleLinkCount
            }),
        )
        .default({}),
    activeLinkName: z.string(),
    // {[id in string]: z.object{}}
    subLinks: z
        .record(
            z.object({
                name: z.string(),
                url: z.string(),
                title: z.string(),
                custom: z.boolean(),
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
        }),
    ),
});
const { useContext: useSidebar, Provider: SidebarContext } =
    createContextFactory(function () {
        // const ctx = useSalesOverviewQuery();
        // const form = useForm<z.infer<typeof schema>>({
        //     defaultValues: {
        //         siteModules: {},
        //         links: {},
        //     },
        // });
        const store = useSidebarStore();
        const data = store;
        const { isMobile } = useBaseSidebar();
        const loader = async () => {
            await timeout(100);
            // const res = await getSalesOverviewAction(
            //     ctx.params["sales-overview-id"],
            // );
            // console.log({ res });
            // return res;
        };

        // const data = useAsyncMemo(loader, []);
        return {
            data,
            isMobile,
            form: {
                setValue: store.update,
            },
            // form,
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
        //  ctx.form.watch(`siteModules.${name}`);
        // const data = useAsyncMemo(loader, []);
        return { siteModule };
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
