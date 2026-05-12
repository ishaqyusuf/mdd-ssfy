"use client";

import Portal from "@/components/_v1/portal";
import { Env } from "@/components/env";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";

type SalesFormType = "order" | "quote";

type Props = {
	type: SalesFormType;
	slug?: string | null;
	orderId?: string | null;
	currentForm: "old" | "new";
};

export function SalesFormDevSwitcher({
	type,
	slug,
	orderId,
	currentForm,
}: Props) {
	if (!slug || !orderId) return null;

	const targetForm = currentForm === "old" ? "new" : "old";
	const href =
		targetForm === "new"
			? `/sales-form/edit-${type}/${slug}`
			: `/sales-book/edit-${type}/${slug}`;
	const label = targetForm === "new" ? "Open in New Form" : "Open in Old Form";

	return (
		<Env isDev>
			<Portal nodeId="navRightSlot" noDelay>
				<Button asChild size="sm" variant="outline" className="gap-2">
					<Link href={href} target="_blank" rel="noopener noreferrer">
						<Icons.ExternalLink className="size-4" />
						<span>{label}</span>
					</Link>
				</Button>
			</Portal>
		</Env>
	);
}
