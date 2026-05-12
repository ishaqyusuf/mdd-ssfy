"use client";

import { cn } from "@/lib/utils";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import type { ViewerShellInput, ViewerShellSize } from "./controller";

const sizeClassName: Record<ViewerShellSize, string> = {
	default: "h-[88vh] w-[min(1120px,94vw)]",
	wide: "h-[92vh] w-[96vw]",
	fullscreen: "h-screen w-screen rounded-none border-0",
};

export function ViewerShell({
	viewer,
	onClose,
}: {
	viewer: ViewerShellInput | null;
	onClose: () => void;
}) {
	const open = !!viewer;
	const closeOnOutsideClick = viewer?.closeOnOutsideClick ?? true;
	const size = viewer?.size ?? "wide";

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent
				hideClose
				onPointerDownOutside={(event) => {
					if (!closeOnOutsideClick) {
						event.preventDefault();
					}
				}}
				className={cn(
					"flex max-w-none translate-y-[-50%] flex-col gap-0 overflow-hidden border border-white/15 bg-background p-0 shadow-2xl sm:rounded-lg",
					viewer ? sizeClassName[size] : sizeClassName.wide,
				)}
			>
				<DialogHeader className="border-b bg-background/95 px-3 py-2 text-left backdrop-blur sm:px-4">
					<div className="flex min-h-10 items-center gap-3">
						{viewer?.icon ? (
							<div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
								{viewer.icon}
							</div>
						) : null}
						<div className="min-w-0 flex-1">
							<DialogTitle className="truncate font-medium text-base leading-5">
								{viewer?.title || "Preview"}
							</DialogTitle>
							<DialogDescription className="truncate text-muted-foreground text-xs">
								{viewer?.subtitle || "Document preview"}
							</DialogDescription>
						</div>
						{viewer?.actions?.length ? (
							<div className="flex shrink-0 items-center gap-1">
								{viewer.actions.map((action) => (
									<Button
										key={action.id}
										type="button"
										variant="ghost"
										size="sm"
										disabled={action.disabled}
										onClick={action.onClick}
										title={action.label}
										aria-label={action.label}
										className="h-9 gap-2 px-2"
									>
										{action.icon}
										<span className="hidden text-xs sm:inline">
											{action.label}
										</span>
									</Button>
								))}
							</div>
						) : null}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={onClose}
							title="Close"
							aria-label="Close preview"
							className="size-9 shrink-0"
						>
							<Icons.X className="size-4" />
						</Button>
					</div>
				</DialogHeader>
				<div className="min-h-0 flex-1 overflow-hidden bg-muted/40">
					{viewer?.content}
				</div>
			</DialogContent>
		</Dialog>
	);
}
