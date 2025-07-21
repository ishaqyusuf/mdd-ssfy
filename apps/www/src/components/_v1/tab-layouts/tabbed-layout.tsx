"use client";

import { useEffect, useState } from "react";
import Link from "@/components/link";
import { redirect, usePathname, useRouter } from "next/navigation";
import { ISidebar, nav } from "@/lib/navs";
import { timeout } from "@/lib/timeout";
import { cn } from "@/lib/utils";
import { PrimitiveDivProps } from "@/types/type";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";

import { Button } from "@gnd/ui/button";
import Portal from "../portal";

export default function TabbedLayout({
    children,
    tabKey,
    tabs = [],
    className,
}: {
    tabs?: {
        path;
        title;
    }[];
    tabKey?: keyof ISidebar;
} & PrimitiveDivProps) {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    const _nav = nav(session);
    const path = usePathname();
    const [tab, setTab] = useState<any>(path);
    // const [tabs, setTabs] = useState<{ label; value }[]>([]);
    const route = useRouter();

    return (
        <div className="space-y-4">
            <Portal nodeId={"pageTab"}>
                <div className="flex ">
                    {(tabKey ? _nav?.[tabKey] : tabs).map((c, i) => (
                        <div className="flex flex-col" key={i}>
                            <Button
                                size="sm"
                                className={cn(
                                    "h-8 p-1 px-4",
                                    c.path != tab && "text-muted-foreground",
                                )}
                                variant={c.path == tab ? "ghost" : "ghost"}
                                asChild
                            >
                                <Link href={c.path}>{c.title}</Link>
                            </Button>
                            <div
                                className={cn(
                                    "mt-1 h-0.5 w-full",
                                    c.path == tab && "bg-primary",
                                )}
                            ></div>
                        </div>
                    ))}
                </div>
            </Portal>

            {/* <Tabs
        defaultValue={tab}
        onChange={(v) => {

        }}
        className=" px-8"
      >
        <TabsList className="bg-transparent">
          {_nav?.[tabKey].map((c, i) => (
            <TabsTrigger
              onClick={() => {
                route.push(c.path);
              }}
              key={i}
              value={c.path}
            >
              {c.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs> */}
            {children && (
                <div className={cn("space-y-4 px-4 sm:px-8", className)}>
                    {children}
                </div>
            )}
        </div>
    );
}
