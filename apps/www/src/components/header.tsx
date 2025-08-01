"use client";
import { MobileMenu } from "./mobile-menu";
import { OpenSearchButton } from "./search/open-search-button";
import { ModeToggle } from "./sidebar/mode-toggle";
import { UserNav } from "./sidebar/user-nav";

export function Header() {
    return (
        <header className="md:m-0 z-50 px-6 md:border-b h-[70px] flex gap-2 items-center desktop:sticky desktop:top-0 desktop:bg-background sticky md:static top-0 backdrop-filter backdrop-blur-xl md:backdrop-filter md:backdrop-blur-none dark:bg-[#121212] bg-[#fff] bg-opacity-70 desktop:rounded-t-[10px]">
            <MobileMenu />
            <div className="flex items-center space-x-4 lg:space-x-0">
                <h1 className="font-bold" id="pageTitle"></h1>
            </div>
            <div id="headerTitleSlot" className="flex items-center space-x-1" />
            <div id="headerNav" className="flex items-center space-x-1" />
            <div id="breadCrumb" className="flex items-center space-x-1"></div>
            <OpenSearchButton />

            {/* <div className="flex space-x-2 ml-auto"></div> */}
            <div className="flex-1"></div>
            <div className="mx-4 flex gap-4 " id="navRightSlot"></div>
            <div className="inline-flex gap-4" id="actionNav"></div>
            <ModeToggle />
            <UserNav />
        </header>
    );
}

