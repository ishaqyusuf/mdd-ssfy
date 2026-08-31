import { Switch } from "@gnd/ui/switch";
import type { ReactNode } from "react";

export function SettingsCard({
	title,
	description,
	children,
	footer,
}: {
	title: string;
	description: string;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<section className="rounded-md border bg-background">
			<div className="border-b px-5 py-4">
				<h2 className="font-semibold">{title}</h2>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			<div className="p-5">{children}</div>
			{footer ? <div className="border-t px-5 py-4">{footer}</div> : null}
		</section>
	);
}

export function SwitchRow({
	title,
	description,
	checked,
	onCheckedChange,
	disabled = false,
}: {
	title: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<div
			className={`flex items-center justify-between gap-6 p-4 ${disabled ? "opacity-60" : ""}`}
		>
			<div>
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			<Switch
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
				aria-label={title}
			/>
		</div>
	);
}
