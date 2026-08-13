"use client";

import { cn } from "@gnd/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SecondaryMenuItem = {
	path: string;
	label: string;
};

type SecondaryMenuProps = {
	ariaLabel: string;
	items: SecondaryMenuItem[];
};

export function SecondaryMenu({ ariaLabel, items }: SecondaryMenuProps) {
	const pathname = usePathname();

	return (
		<nav aria-label={ariaLabel} className="border-b">
			<ul className="flex gap-6 overflow-x-auto scrollbar-hide">
				{items.map((item) => {
					const isActive = pathname === item.path;

					return (
						<li key={item.path} className="shrink-0">
							<Link
								href={item.path}
								prefetch
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"block border-b-2 border-transparent px-1 pb-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isActive && "border-foreground font-medium text-foreground",
								)}
							>
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
