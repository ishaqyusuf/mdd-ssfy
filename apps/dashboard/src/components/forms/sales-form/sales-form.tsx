import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ItemSection from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/item-section";
import { zhAddItem } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { SalesMenu } from "@/components/sales-menu";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { cn, sum } from "@/lib/utils";
import { useSalesPrintController } from "@/modules/sales-print/application/use-sales-print-controller";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { useMediaQuery } from "@gnd/ui/hooks/use-media-query";
import { Icons } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { FormWatcher } from "./form-watcher";
import { LegacySalesCustomerSelectorDialog } from "./sales-customer-input";
import { SalesFormSave } from "./sales-form-save";
import { SalesFormSidebar } from "./sales-form-sidebar";
import TakeOff from "./take-off";
import { TakeoffSwitch } from "./take-off/takeoff-switch";

export function SalesFormClient({
	data,
	adjustmentAccess = { readOnly: false },
	versionSwitcher,
}) {
	const currentTab = useFormDataStore((state) => state.currentTab);
	const formStatus = useFormDataStore((state) => state.formStatus);
	const setCurrentTab = useFormDataStore((state) => state.dotUpdate);

	useLayoutEffect(() => {
		if (currentTab === "invoice") return;
		setCurrentTab("currentTab", "invoice");
	}, [currentTab, setCurrentTab]);

	if (!formStatus || currentTab !== "invoice") return null;

	return (
		<Content
			data={data}
			adjustmentAccess={adjustmentAccess}
			versionSwitcher={versionSwitcher}
		/>
	);
}

function Content({ data, adjustmentAccess, versionSwitcher }) {
	const readOnly = adjustmentAccess.readOnly;
	const sPreview = useSalesPreview();
	const zus = useFormDataStore();
	const [showMobileSalesPanel, setShowMobileSalesPanel] = useState(false);
	const [takeOff, setTakeOff] = useState(false);
	const [customerSelectorDismissed, setCustomerSelectorDismissed] =
		useState(false);
	const isMobilePanel = useMediaQuery("(max-width: 1279px)");
	const previewId = zus.metaData?.id ?? null;
	const shouldPromptCustomerSelection =
		!previewId && !zus.metaData?.customer?.id;
	const shouldShowCustomerSelection =
		shouldPromptCustomerSelection && !customerSelectorDismissed;

	function preview() {
		if (!previewId) return;
		void sPreview.preview(previewId, zus?.metaData?.type);
	}

	useEffect(() => {
		if (isMobilePanel) return;
		setShowMobileSalesPanel(false);
	}, [isMobilePanel]);

	useEffect(() => {
		if (shouldPromptCustomerSelection) return;
		setCustomerSelectorDismissed(false);
	}, [shouldPromptCustomerSelection]);

	return (
		<div className="fixed bottom-0 left-0 right-0 top-[var(--header-height)] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/70 md:left-[84px]">
			<LegacySalesCustomerSelectorDialog
				open={shouldShowCustomerSelection}
				type={zus.metaData?.type}
				onOpenChange={(open) => {
					if (!open) setCustomerSelectorDismissed(true);
				}}
			/>
			<div className="relative flex h-full min-h-0 overflow-hidden border border-slate-200/80 bg-white/80 shadow-sm">
				<main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
					<div className="shrink-0 flex border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-slate-900 p-1.5 text-white">
								<Icons.Sparkles className="size-3.5" />
							</div>
							<div>
								<h1 className="text-lg font-semibold capitalize text-slate-900 md:text-xl">
									{data?.order?.type} Builder
								</h1>
								<p className="text-xs text-slate-500">
									Configure items and keep pricing in sync
								</p>
							</div>
						</div>
						<div className="flex-1" />
						<div className="flex items-center gap-2">
							{versionSwitcher}
							<TakeoffSwitch takeOff={takeOff} takeOffChanged={setTakeOff} />
							<Button
								size="sm"
								variant="outline"
								className={cn(
									"hidden",
									isMobilePanel ? "inline-flex" : "xl:inline-flex",
								)}
								onClick={() => setShowMobileSalesPanel((prev) => !prev)}
							>
								{showMobileSalesPanel ? "Hide Sales Panel" : "Show Sales Panel"}
							</Button>
						</div>
					</div>
					{adjustmentAccess.readOnly ? (
						<output className="flex shrink-0 flex-col gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between md:px-6">
							<div className="flex min-w-0 items-start gap-2">
								<Icons.ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
								<div>
									<p className="text-sm font-medium">
										{adjustmentAccess.title}
									</p>
									<p className="text-xs text-amber-800">
										{adjustmentAccess.description}
									</p>
								</div>
							</div>
							{adjustmentAccess.newFormHref ? (
								<Button asChild size="sm" className="shrink-0">
									<Link href={adjustmentAccess.newFormHref}>
										Continue in new sales form
									</Link>
								</Button>
							) : null}
						</output>
					) : null}

					<div
						inert={readOnly ? true : undefined}
						aria-disabled={readOnly || undefined}
						className={cn(
							"flex-1 overflow-y-auto p-3 pb-24 md:p-6 md:pb-24 xl:pb-24",
							readOnly && "select-text opacity-80",
						)}
					>
						<div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
							{takeOff ? (
								<TakeOff />
							) : (
								<div className="space-y-4">
									{zus.sequence?.formItem?.map((uid) => (
										<ItemSection key={uid} uid={uid} />
									))}
								</div>
							)}
						</div>
					</div>
					<SalesFormActionToolbar onPreview={preview} readOnly={readOnly} />
				</main>

				<SalesFormSidebar
					mobileOpen={showMobileSalesPanel}
					onClose={() => setShowMobileSalesPanel(false)}
					readOnly={readOnly}
				/>
			</div>

			<FormWatcher />
		</div>
	);
}

function SalesFormActionToolbar({
	onPreview,
	readOnly,
}: {
	onPreview: () => void;
	readOnly: boolean;
}) {
	const zus = useFormDataStore();
	const previewId = zus?.metaData?.id ?? null;
	const isSaved = !!previewId;
	const isOrder = zus?.metaData?.type === "order";
	const amount = sum([
		zus?.metaData?.pricing?.grandTotal,
		-1 * zus?.metaData?.pricing?.paid,
	]);
	const overviewQuery = useSalesOverviewQuery();
	const salesPrint = useSalesPrintController();
	const customer = zus?.metaData?.customer as
		| {
				email?: string | null;
				businessName?: string | null;
				name?: string | null;
				phoneNo?: string | null;
		  }
		| undefined;

	const print = async (event?: { shiftKey?: boolean }) => {
		if (!previewId) return;
		await salesPrint.print({
			salesIds: [previewId],
			mode: isOrder ? "invoice" : "quote",
			openInNewTab: !!event?.shiftKey,
			salesType: isOrder ? "order" : "quote",
		});
	};

	const downloadPdf = async () => {
		if (!previewId) return;
		await salesPrint.downloadPdf({
			salesIds: [previewId],
			mode: isOrder ? "invoice" : "quote",
			salesType: isOrder ? "order" : "quote",
		});
	};

	const overview = () => {
		overviewQuery.open2(
			zus.metaData?.salesId,
			zus.metaData.type === "order" ? "sales" : "quote",
		);
	};

	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-1 z-10 flex justify-center px-2 pb-[env(safe-area-inset-bottom)]">
			<TooltipProvider delayDuration={120}>
				<div className="pointer-events-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-1 overflow-hidden rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
					<TooltipIcon label="Add item">
						<Button
							type="button"
							size="icon"
							onClick={() => {
								zhAddItem();
							}}
							disabled={readOnly}
							className="size-8 rounded-full"
							aria-label="Add item"
						>
							<Icons.Plus className="size-3.5" />
						</Button>
					</TooltipIcon>

					{isSaved && (
						<div className="hidden items-center gap-1 lg:flex">
							{isOrder && !readOnly && (
								<SalesPaymentProcessor
									phoneNo={zus.metaData.primaryPhone}
									selectedIds={[zus.metaData.id]}
									customerId={zus.metaData.customer.id}
									disabled={!amount || !zus.metaData.salesId}
								>
									<Button
										type="button"
										size="icon"
										variant="outline"
										disabled={!amount || !zus.metaData.salesId}
										className="size-8 rounded-full"
										aria-label="Pay"
										title="Pay"
									>
										<Icons.payment className="size-3.5" />
									</Button>
								</SalesPaymentProcessor>
							)}
							{!readOnly ? (
								<SalesMenu
									id={zus?.metaData?.id}
									salesIds={previewId ? [previewId] : []}
									type={zus?.metaData?.type}
									orderNo={zus?.metaData?.salesId}
									customerEmail={customer?.email ?? null}
									customerPhone={customer?.phoneNo ?? null}
									customerName={customer?.businessName || customer?.name}
									trigger={
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-8 rounded-full"
											aria-label="Email"
											title="Email"
										>
											<Icons.Mail className="size-3.5" />
										</Button>
									}
								>
									{isOrder ? (
										<SalesMenu.SalesEmailMenuItems />
									) : (
										<SalesMenu.QuoteEmailMenuItems />
									)}
								</SalesMenu>
							) : null}
							<TooltipIcon label="Preview">
								<Button
									type="button"
									size="icon"
									variant="outline"
									onClick={() => onPreview()}
									disabled={!previewId}
									className="size-8 rounded-full"
									aria-label="Preview"
								>
									<Icons.Eye className="size-3.5" />
								</Button>
							</TooltipIcon>
							<TooltipIcon
								label={salesPrint.isPrinting ? "Preparing print" : "Print"}
							>
								<Button
									type="button"
									size="icon"
									variant="outline"
									onClick={(event) => void print(event)}
									disabled={salesPrint.isPrinting}
									className="size-8 rounded-full"
									aria-label={
										salesPrint.isPrinting ? "Preparing print" : "Print"
									}
								>
									{salesPrint.isPrinting ? (
										<Icons.Loader2 className="size-3.5 animate-spin" />
									) : (
										<Icons.Printer className="size-3.5" />
									)}
								</Button>
							</TooltipIcon>
							<TooltipIcon
								label={salesPrint.isDownloading ? "Preparing PDF" : "PDF"}
							>
								<Button
									type="button"
									size="icon"
									variant="outline"
									onClick={() => void downloadPdf()}
									disabled={salesPrint.isDownloading}
									className="size-8 rounded-full"
									aria-label={
										salesPrint.isDownloading ? "Preparing PDF" : "PDF"
									}
								>
									{salesPrint.isDownloading ? (
										<Icons.Loader2 className="size-3.5 animate-spin" />
									) : (
										<Icons.FileText className="size-3.5" />
									)}
								</Button>
							</TooltipIcon>
							<TooltipIcon label="Overview">
								<Button
									type="button"
									size="icon"
									variant="secondary"
									onClick={overview}
									className="size-8 rounded-full"
									aria-label="Overview"
								>
									<Icons.ExternalLink className="size-3.5" />
								</Button>
							</TooltipIcon>
						</div>
					)}
					{!isSaved && (
						<TooltipIcon label="Preview">
							<Button
								type="button"
								size="icon"
								variant="outline"
								onClick={() => onPreview()}
								disabled={!previewId}
								className="hidden size-8 rounded-full sm:inline-flex"
								aria-label="Preview"
							>
								<Icons.Eye className="size-3.5" />
							</Button>
						</TooltipIcon>
					)}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<TooltipIcon label="More actions">
								<Button
									type="button"
									size="icon"
									variant="outline"
									className={cn(
										"size-8 shrink-0 rounded-full lg:hidden",
										!isSaved && "sm:hidden",
									)}
									aria-label="More actions"
								>
									<Icons.MoreHorizontal className="size-3.5" />
								</Button>
							</TooltipIcon>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-52">
							{isSaved && (
								<>
									{isOrder && !readOnly && (
										<SalesPaymentProcessor
											phoneNo={zus.metaData.primaryPhone}
											selectedIds={[zus.metaData.id]}
											customerId={zus.metaData.customer.id}
											disabled={!amount || !zus.metaData.salesId}
										>
											<DropdownMenuItem
												disabled={!amount || !zus.metaData.salesId}
												onSelect={(event) => event.preventDefault()}
											>
												<Icons.payment className="mr-2 size-4" />
												Pay
											</DropdownMenuItem>
										</SalesPaymentProcessor>
									)}
									{!readOnly ? (
										<SalesMenu
											id={zus?.metaData?.id}
											salesIds={previewId ? [previewId] : []}
											type={zus?.metaData?.type}
											orderNo={zus?.metaData?.salesId}
											customerEmail={customer?.email ?? null}
											customerPhone={customer?.phoneNo ?? null}
											customerName={customer?.businessName || customer?.name}
											trigger={
												<DropdownMenuItem
													onSelect={(event) => event.preventDefault()}
												>
													<Icons.Mail className="mr-2 size-4" />
													Email
												</DropdownMenuItem>
											}
										>
											{isOrder ? (
												<SalesMenu.SalesEmailMenuItems />
											) : (
												<SalesMenu.QuoteEmailMenuItems />
											)}
										</SalesMenu>
									) : null}
									<DropdownMenuItem
										disabled={!previewId}
										onSelect={() => onPreview()}
									>
										<Icons.Eye className="mr-2 size-4" />
										Preview
									</DropdownMenuItem>
									<DropdownMenuItem
										disabled={salesPrint.isPrinting}
										onSelect={(event) => {
											event.preventDefault();
											void print();
										}}
									>
										{salesPrint.isPrinting ? (
											<Icons.Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Icons.Printer className="mr-2 size-4" />
										)}
										{salesPrint.isPrinting ? "Preparing..." : "Print"}
									</DropdownMenuItem>
									<DropdownMenuItem
										disabled={salesPrint.isDownloading}
										onSelect={(event) => {
											event.preventDefault();
											void downloadPdf();
										}}
									>
										{salesPrint.isDownloading ? (
											<Icons.Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Icons.FileText className="mr-2 size-4" />
										)}
										{salesPrint.isDownloading ? "Preparing..." : "PDF"}
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={overview}>
										<Icons.ExternalLink className="mr-2 size-4" />
										Overview
									</DropdownMenuItem>
								</>
							)}
							{!isSaved && (
								<DropdownMenuItem
									disabled={!previewId}
									onSelect={() => onPreview()}
									className="sm:hidden"
								>
									<Icons.Eye className="mr-2 size-4" />
									Preview
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
					<TooltipIcon label="Save">
						<SalesFormSave
							type="button"
							iconOnly
							disabled={readOnly}
							className="size-8 rounded-full p-0"
						/>
					</TooltipIcon>
				</div>
			</TooltipProvider>
		</div>
	);
}

function TooltipIcon({
	children,
	label,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side="top" className="px-2 py-1 text-xs">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}
