"use client";

import type { PageFilterData } from "@api/type";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";
import { CustomersSearchFilter } from "./customers-search-filter";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function CustomersHeader({ initialFilterList }: Props) {
	return (
		<div className="flex items-center gap-4">
			<CustomersSearchFilter initialFilterList={initialFilterList} />
			<div className="flex-1" />
			<Button asChild>
				<Link href="/customers/new">
					<Icons.Add className="mr-2 size-4" />
					<span className="hidden lg:inline">New</span>
				</Link>
			</Button>
		</div>
	);
}
