"use client";

import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { cn } from "@gnd/ui/cn";
import { Separator } from "@gnd/ui/separator";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

export function SalesCustomTab() {
	const path = usePathname();

	return (
		<ButtonGroup>
			{["orders", "quotes"].map((item, index) => (
				<Fragment key={item}>
					<Button
						asChild
						className={cn("capitalize", path.includes(item) && "bg-green-600")}
						variant={path.includes(item) ? "default" : "outline"}
					>
						<Link href={`/${item}`}>{index === 0 ? "Sales" : item}</Link>
					</Button>
					{index !== 0 || <Separator orientation="vertical" />}
				</Fragment>
			))}
		</ButtonGroup>
	);
}
