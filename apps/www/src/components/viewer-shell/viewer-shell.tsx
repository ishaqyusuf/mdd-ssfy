"use client";

import { cn } from "@/lib/utils";
import { Button } from "@gnd/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useEffect, useState } from "react";
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
	const [revision, setRevision] = useState(0);

	useEffect(() => {
		if (viewer) {
			setRevision(0);
		}
	}, [viewer]);

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
					"relative flex max-w-none translate-y-[-50%] flex-col gap-0 overflow-hidden border border-white/15 bg-background p-0 shadow-2xl sm:rounded-lg",
					viewer ? sizeClassName[size] : sizeClassName.wide,
				)}
			>
				<DialogTitle className="sr-only">
					{viewer?.title || "Preview"}
				</DialogTitle>
				<div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-md border border-border/40 bg-background/55 p-1 shadow-sm backdrop-blur-md">
					{viewer?.actions?.map((action) => (
						<Button
							key={action.id}
							type="button"
							variant="ghost"
							size="sm"
							disabled={action.disabled}
							onClick={action.onClick}
							title={action.label}
							aria-label={action.label}
							className="h-9 gap-2 px-2 hover:bg-background/80"
						>
							{action.icon}
							<span className="hidden text-xs sm:inline">{action.label}</span>
						</Button>
					))}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => setRevision((current) => current + 1)}
						title="Refresh preview"
						aria-label="Refresh preview"
						className="size-9 shrink-0 hover:bg-background/80"
					>
						<Icons.RefreshCw className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={onClose}
						title="Close"
						aria-label="Close preview"
						className="size-9 shrink-0 hover:bg-background/80"
					>
						<Icons.X className="size-4" />
					</Button>
				</div>
				<div
					key={`${viewer?.id ?? "viewer"}-${revision}`}
					className="min-h-0 flex-1 overflow-hidden bg-muted/40"
				>
					{viewer?.content}
				</div>
			</DialogContent>
		</Dialog>
	);
}
