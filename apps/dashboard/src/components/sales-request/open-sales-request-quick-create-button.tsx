"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import Link from "next/link";

export function OpenSalesRequestQuickCreateButton() {
	const auth = useAuth();
	if (!auth?.can?.viewAssistant) return null;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						asChild
						variant="outline"
						size="icon"
						className="size-8 rounded-full"
						aria-label="Create order from customer request"
					>
						<Link href="/assistant?newSalesRequest=order">
							<Icons.Sparkles className="size-4" />
						</Link>
					</Button>
				</TooltipTrigger>
				<TooltipContent side="bottom">New request in Assistant</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
