"use client";

import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

import Portal from "./_v1/portal";
import { Menu } from "./(clean-code)/menu";

export function SalesQuickAction({}) {
    return (
        <Portal nodeId={"navRightSlot"}>
            <AuthGuard noRedirect can={["viewSales"]}>
                <Menu label={"Quick Action"}>
                    <Menu.Item href={`/sales-book/create-order`}>
                        New Sales
                    </Menu.Item>
                    <Menu.Item href={`/sales-book/create-quote`}>
                        New Quote
                    </Menu.Item>
                </Menu>
            </AuthGuard>
        </Portal>
    );
}
