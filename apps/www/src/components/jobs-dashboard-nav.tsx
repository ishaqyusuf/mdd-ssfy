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
		<div className="inline-flex w-full flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white/85 p-2 shadow-sm shadow-slate-200/60 backdrop-blur">
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
						variant={active ? "default" : "ghost"}
						className={
							active
								? "rounded-xl bg-slate-900 text-white shadow-sm hover:bg-slate-800"
								: "rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
						}
					>
						<Link href={link.href}>{link.label}</Link>
					</Button>
				);
			})}
		</div>
	);
}
