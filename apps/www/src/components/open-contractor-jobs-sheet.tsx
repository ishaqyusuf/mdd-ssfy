"use client";

import { useJobFormParams } from "@/hooks/use-job-form-params";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import type { ComponentProps } from "react";

type Props = {
	label?: string;
	className?: string;
	variant?: ComponentProps<typeof Button>["variant"];
	size?: ComponentProps<typeof Button>["size"];
	disabled?: boolean;
	disabledReason?: string;
};

export function OpenJobSheet({
	label,
	className,
	variant = "outline",
	size = label ? "default" : "icon",
	disabled,
	disabledReason,
}: Props) {
	const { setParams } = useJobFormParams();

	return (
		<Button
			variant={variant}
			size={size}
			className={cn(className)}
			disabled={disabled}
			title={disabled ? disabledReason : undefined}
			onClick={() =>
				setParams({
					step: 1,
				})
			}
		>
			<Icons.Add />
			{label ? <span>{label}</span> : null}
		</Button>
	);
}
