"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useRouter } from "next/navigation";

type SalesRepTabOption = {
	disabled: boolean;
	href: string;
	label: string;
	value: string;
};

export function SalesRepTabSelector({
	activeTab,
	options,
}: {
	activeTab: string;
	options: SalesRepTabOption[];
}) {
	const router = useRouter();

	return (
		<Select
			value={activeTab}
			onValueChange={(value) => {
				const selectedTab = options.find((option) => option.value === value);

				if (selectedTab && !selectedTab.disabled) {
					router.push(selectedTab.href);
				}
			}}
		>
			<SelectTrigger
				aria-label="Select sales rep dashboard section"
				className="w-full md:hidden"
			>
				<SelectValue placeholder="Choose a section" />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem
						disabled={option.disabled}
						key={option.value}
						value={option.value}
					>
						{option.label}
						{option.disabled ? " (Work in progress)" : null}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
