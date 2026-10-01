"use client";

import { SiteNav, useSiteNav } from "@gnd/site-nav";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";
import type { CSSProperties } from "react";
import { OpenSearchButton } from "./search/open-search-button";
import { HeaderActions, UserNav } from "./user-nav";

export function Header() {
	const { isExpanded, linkModules } = useSiteNav();
	const noSidebar = Boolean(linkModules?.noSidebar);
	const sidebarHeaderOffset =
		isExpanded && !linkModules?.noSidebar ? "184px" : "0px";

	return (
		<>
			<header
				className="fixed inset-x-0 top-0 z-50 flex h-[70px] items-center justify-between gap-4 border-b bg-background/90 px-4 shadow-sm backdrop-blur-xl backdrop-filter transition-[padding-left,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none md:relative md:m-0 md:border-b md:bg-background/70 md:pl-[calc(1.5rem+var(--site-nav-header-offset))] md:pr-6 md:shadow-none md:backdrop-blur-none md:backdrop-filter desktop:rounded-t-[10px]"
				style={
					{
						"--site-nav-header-offset": sidebarHeaderOffset,
						transform: "translateY(calc(var(--header-offset, 0px) * -1))",
						transitionDuration: "var(--header-transition, 300ms)",
						transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
						willChange: "transform, padding-left",
					} as CSSProperties
				}
			>
				<SiteNav.MobileSidebar />
				{noSidebar ? (
					<Link
						href="/"
						aria-label="GND home"
						className="flex shrink-0 items-center"
					>
						<Icons.Logo />
					</Link>
				) : null}
				<div id="goBackSlot" className="empty:hidden" />
				<div className="flex min-w-0 items-center space-x-4 whitespace-nowrap lg:space-x-0">
					<h1 className="min-w-0 truncate font-bold" id="pageTitle">
						<span className="sr-only">Current page</span>
					</h1>
				</div>
				<div
					id="headerTitleSlot"
					className="hidden items-center space-x-1 whitespace-nowrap empty:hidden md:flex"
				/>
				<div
					id="headerNav"
					className="hidden items-center space-x-1 empty:hidden md:flex"
				/>
				<div
					id="breadCrumb"
					className="hidden items-center space-x-1 empty:hidden md:flex"
				/>
				<div className="hidden md:contents">
					<OpenSearchButton />
				</div>
				<div className="flex-1" />
				<div
					className="mx-4 hidden gap-4 empty:hidden md:flex"
					id="navRightSlot"
				/>
				<div
					className="hidden gap-4 empty:hidden md:inline-flex"
					id="actionNav"
				/>
				<div className="hidden items-center gap-2 md:flex">
					<HeaderActions />
				</div>
				<UserNav links={linkModules} />
			</header>
			<div className="h-[70px] md:hidden" />
			<div className="dark:bg-muted" id="pageTab" />
			<div className="overflow-auto" id="tab" />
		</>
	);
}
