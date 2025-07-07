"use client";

import { Icons } from "@/components/_v1/icons";
import CartHeader from "./cart-header";
import { MainNav } from "./main-nav";
import { siteConfig } from "@/config/site";
import { CartSheet } from "./cart/cart-sheet";

export default function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background">
            <div className="container flex min-h-16 py-2 items-center">
                <MainNav items={siteConfig.mainNav} />
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <nav className="flex items-center space-x-2">
                        <CartSheet />
                    </nav>
                </div>
            </div>
        </header>
    );
}
