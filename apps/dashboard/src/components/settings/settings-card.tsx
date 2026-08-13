import { Switch } from "@gnd/ui/switch";
import type { ReactNode } from "react";

export function SettingsCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="rounded-md border bg-background">
			<div className="border-b px-5 py-4">
				<h2 className="font-semibold">{title}</h2>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			<div className="p-5">{children}</div>
		</section>
	);
}

export function SwitchRow({
	title,
	description,
	checked,
	onCheckedChange,
}: {
	title: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-6 p-4">
			<div>
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				aria-label={title}
			/>
		</div>
	);
}
