"use client";

import { SalesHtmlDocument } from "@gnd/pdf/sales-v2";
import type { PrintPage } from "@gnd/sales/print/types";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";

const EMPTY_COMPANY_ADDRESS = {
	address1: "",
	address2: "",
	phone: "",
} as const;

export function RequestGenerationInvoicePreviewDialog({
	page,
	onClose,
}: {
	page: PrintPage | null;
	onClose: () => void;
}) {
	return (
		<Dialog open={page !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="flex h-[92dvh] max-w-[min(100vw-1rem,1040px)] flex-col overflow-hidden p-0">
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle>Unsaved invoice preview</DialogTitle>
					<DialogDescription>
						This preview is composed from the current in-memory form. Nothing
						has been saved or sent.
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 flex-1 overflow-auto bg-muted/40 p-3 sm:p-6">
					{page ? (
						<div className="mx-auto w-full max-w-[980px] bg-background shadow-lg [&_.sales-html-document]:w-full">
							<SalesHtmlDocument
								pages={[page]}
								templateId="template-2"
								companyAddress={EMPTY_COMPANY_ADDRESS}
							/>
						</div>
					) : null}
				</div>
				<DialogFooter className="border-t px-5 py-3">
					<Button type="button" variant="outline" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
