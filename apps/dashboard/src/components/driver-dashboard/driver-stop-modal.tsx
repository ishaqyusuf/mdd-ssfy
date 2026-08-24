"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function DriverStopModal({ children }: { children: ReactNode }) {
	const router = useRouter();

	return (
		<Dialog open onOpenChange={(open) => !open && router.back()}>
			<DialogContent
				hideClose
				className="fixed inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 sm:rounded-none"
			>
				<DialogHeader className="sr-only">
					<DialogTitle>Driver stop workspace</DialogTitle>
					<DialogDescription>
						Review, pack, process, and complete the selected stop.
					</DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}
