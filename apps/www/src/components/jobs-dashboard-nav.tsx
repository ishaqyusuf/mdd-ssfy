"use client";

import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
	{ href: "/jobs-dashboard", label: "Overview" },
	{ href: "/jobs-dashboard/jobs-list", label: "Jobs List" },
	{ href: "/jobs-dashboard/payments", label: "Payments" },
];

export function JobsDashboardNav() {
	const pathname = usePathname();

	return (
		<div className="flex flex-wrap gap-2">
			{links.map((link) => {
				const active =
					pathname === link.href ||
					(link.href !== "/jobs-dashboard" &&
						pathname.startsWith(`${link.href}/`));

				return (
					<Button
						asChild
						key={link.href}
						size="sm"
						variant={active ? "default" : "outline"}
					>
						<Link href={link.href}>{link.label}</Link>
					</Button>
				);
			})}
		</div>
	);
}
