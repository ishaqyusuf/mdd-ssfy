import type { ComponentType, SVGProps } from "react";

export function SectionHeading({
	icon: Icon,
	title,
	action,
	id,
}: {
	icon: ComponentType<SVGProps<SVGSVGElement>>;
	title: string;
	action?: React.ReactNode;
	id?: string;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<h2
				id={id}
				className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
			>
				<Icon aria-hidden="true" />
				{title}
			</h2>
			{action}
		</div>
	);
}
