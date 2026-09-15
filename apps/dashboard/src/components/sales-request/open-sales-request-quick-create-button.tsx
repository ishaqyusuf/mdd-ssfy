"use client";

import { useSalesRequestQuickCreateStore } from "@/store/sales-request-quick-create";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";

export function OpenSalesRequestQuickCreateButton() {
	const open = useSalesRequestQuickCreateStore((state) => state.open);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="size-8 rounded-full"
						aria-label="Create order from customer request"
						onClick={open}
					>
						<Icons.Sparkles className="size-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="bottom">New request</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
