"use client";

import { createContext, use, useContext, useEffect } from "react";
import Link from "@/components/link";
// import { usePathname, useSearchParams } from "next/navigation";
import Portal from "@/components/_v1/portal";
import { typedMemo } from "@/lib/hocs/typed-memo";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";

import FContentShell from "./f-content-shell";

// import Link from "@/components/link";

interface Props {
    children?;
    tabs?: PageTab[];
    promise?;
    port?: boolean;
}
export interface PageTab {
    count?;
    params?: { [k in string]: string };
    title: string;
    url?: string;
}
interface FormProps {
    currentTab?: string;
    tabs: {
        [tab in string]: TabProps;
    };
    tabData: {
        [tab in string]: {
            current?: boolean;
            url?: string;
        };
    };
}
// const useCtx = () => {
//     const query = useSearchParams();
//     const pathname = usePathname();
//     const form = useForm<FormProps>({
//         defaultValues: {
//             currentTab: null,
//             tabs: {},
//         },
//     });
//     const [currentTab, tabs, tabData] = form.watch([
//         "currentTab",
//         "tabs",
//         "tabData",
//     ]);
//     useEffect(() => {
//         // const currentUrl = `${pathname}?${query.toString()}`
//         let tabData: FormProps["tabData"] = {};
//         let cTab = null;
//         let fallbackTab = null;
//         let defaultTab = null;
//         // console.log(tabs);

//         Object.entries(tabs).map(([k, v]) => {
//             const newSearchParams = new URLSearchParams(query?.toString());
//             newSearchParams.delete("_page");
//             newSearchParams.delete(v.qk);
//             let tabName = v.tabName || v.children;
//             if (v.qk || v.href) {
//                 const qv = query.get(v.qk);
//                 if (qv == v.qv && (v.href ? pathname == v.href : true)) {
//                     cTab = tabName;
//                 }
//                 // console.log(v.href);
//                 if (v.href && pathname == v.href && !fallbackTab) {
//                     fallbackTab = v.href;
//                     // console.log({ fallbackTab });
//                 }
//                 newSearchParams.set(v.qk, v.qv);
//                 newSearchParams.set(v.qk, v.qv || null);
//             } else {
//                 defaultTab = tabName;
//             }
//             const url = `${v.href || pathname}?${
//                 !v.qk ? "" : newSearchParams.toString()
//             }`
//                 ?.split("?")
//                 ?.filter(Boolean)
//                 ?.join("?");

//             tabData[tabName] = {
//                 current: cTab == tabName,
//                 url,
//             };
//         });
//         if (!cTab && defaultTab) {
//             tabData[defaultTab].current = true;
//         }
//         form.setValue("tabData", tabData);
//     }, [query, tabs]);
//     return {
//         form,
//         register(props: TabProps) {
//             if (props.tabName || props.children)
//                 form.setValue(
//                     `tabs.${props.tabName || props.children}` as any,
//                     {
//                         ...props,
//                     },
//                 );
//         },
//         tabs,
//         tabData,
//         currentTab,
//     };
// };
// const ctx = createContext<ReturnType<typeof useCtx>>({} as any);
function _FPageTabs({ children, promise, tabs, port }: Props) {
    // const _values = useCtx();
    // const _tabList: PageTab[] = tabs || promise ? use(promise) : null;
    // useEffect(() => {
    //     if (_tabList?.length) {
    //         // console.log(_tabList);
    //         const tabs = {};
    //         _tabList?.map(
    //             (t) =>
    //                 (tabs[t.title] = {
    //                     ...t.params,
    //                     ...t,
    //                     tabName: t.title,
    //                     // count: t.count
    //                     href: t.url,
    //                 }),
    //         );
    //         _values.form.reset({
    //             tabs,
    //         });
    //     }
    // }, [_tabList]);
    // function Render() {
    //     return (
    //         <ctx.Provider value={_values}>
    //             <FContentShell className="h-10 w-full flex-1 border-b">
    //                 {children}
    //                 {_tabList &&
    //                     _tabList?.map((tab) => (
    //                         <MemoiedTab
    //                             tabName={tab.title}
    //                             {...tab.params}
    //                             href={tab.url}
    //                             key={tab.title}
    //                             count={tab.count}
    //                         />
    //                     ))}
    //             </FContentShell>
    //         </ctx.Provider>
    //     );
    // }
    // if (port)
    //     return (
    //         <Portal nodeId={"pageTab"}>
    //             <Render />
    //         </Portal>
    //     );
    // return <Render />;
    return <></>;
}

interface TabProps {
    children?: any;
    tabName?: string;
    href?: string;
    query?: {
        k?: string;
        v?: string;
    }[];
    qk?: string;
    qv?: string;
    count?;
}
function Tab(props: TabProps) {
    return <></>;
    // const ct = useContext(ctx);
    // // const register = useCallback(ct.register, [ct]);
    // const { form } = ct;

    // useEffect(() => {
    //     if (props.tabName || props.children) {
    //         // setTimeout(() => {
    //         // console.log("REGISTERED");
    //         // form.setValue(`tabs.${props.tabName || props.children}` as any, {
    //         //     ...props,
    //         // });
    //         // }, 1000);
    //     }
    // }, []);
    // // useEffect(() => {
    // //     register(props);
    // //     console.log("...");
    // // }, [register, props]);
    // return (
    //     <Button
    //         variant={"ghost"}
    //         size="sm"
    //         className={cn(
    //             ct.tabData?.[props.tabName || props.children]?.current
    //                 ? "rounded-none border-b-2 border-blue-600"
    //                 : "text-muted-foreground",
    //             "h-10",
    //         )}
    //         asChild
    //         disabled={ct.tabData?.[props.tabName || props.children]?.current}
    //     >
    //         <Link
    //             className={cn("inline-flex items-center space-x-2")}
    //             href={ct.tabData?.[props.tabName || props.children]?.url || ""}
    //         >
    //             <span>{props.children || props.tabName}</span>
    //             {props.count >= 0 && (
    //                 <Badge className="px-2" variant="secondary">
    //                     {props.count}
    //                 </Badge>
    //             )}
    //         </Link>
    //     </Button>
    // );
}
const MemoiedTab = typedMemo(Tab, (pre, cur) => pre != cur);
export let FPageTabs = Object.assign(_FPageTabs, {
    Tab: MemoiedTab,
});
