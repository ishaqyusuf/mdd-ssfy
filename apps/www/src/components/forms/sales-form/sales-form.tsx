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
import { useEffect, useLayoutEffect, useState } from "react";
import { FormWatcher } from "./form-watcher";
import { SalesFormSave } from "./sales-form-save";
import { SalesFormSidebar } from "./sales-form-sidebar";
import TakeOff from "./take-off";
import { TakeoffSwitch } from "./take-off/takeoff-switch";

export function SalesFormClient({ data }) {
	const currentTab = useFormDataStore((state) => state.currentTab);
	const formStatus = useFormDataStore((state) => state.formStatus);
	const setCurrentTab = useFormDataStore((state) => state.dotUpdate);

	useLayoutEffect(() => {
		if (currentTab === "invoice") return;
		setCurrentTab("currentTab", "invoice");
	}, [currentTab, setCurrentTab]);

	if (!formStatus || currentTab !== "invoice") return null;

	return <Content data={data} />;
}

function Content({ data }) {
	const sPreview = useSalesPreview();
	const zus = useFormDataStore();
	const [showMobileSalesPanel, setShowMobileSalesPanel] = useState(false);
	const [takeOff, setTakeOff] = useState(false);
	const isMobilePanel = useMediaQuery("(max-width: 1279px)");
	const previewId = zus.metaData?.id ?? null;

	function preview() {
		if (!previewId) return;
		void sPreview.preview(previewId, zus?.metaData?.type);
	}

	useEffect(() => {
		if (isMobilePanel) return;
		setShowMobileSalesPanel(false);
	}, [isMobilePanel]);

	return (
		<div className="fixed bottom-0 left-0 right-0 top-[var(--header-height)] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/70 md:left-[84px]">
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
							<TakeoffSwitch
								takeOff={takeOff}
								takeOffChanged={setTakeOff}
							/>
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

					<div className="flex-1 overflow-y-auto p-3 pb-24 md:p-6 md:pb-24 xl:pb-24">
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
					<SalesFormActionToolbar onPreview={preview} />
				</main>

				<SalesFormSidebar
					mobileOpen={showMobileSalesPanel}
					onClose={() => setShowMobileSalesPanel(false)}
				/>
			</div>

			<FormWatcher />
		</div>
	);
}

function SalesFormActionToolbar({ onPreview }: { onPreview: () => void }) {
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

	const print = async (event?: { shiftKey?: boolean }) => {
		if (!previewId) return;
		await salesPrint.print({
			salesIds: [previewId],
			mode: isOrder ? "invoice" : "quote",
			openInNewTab: !!event?.shiftKey,
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
		<div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-2 pb-[env(safe-area-inset-bottom)]">
			<div className="pointer-events-auto flex w-full max-w-[min(100%,38rem)] items-center gap-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
				<Button
					type="button"
					size="sm"
					onClick={() => {
						zhAddItem();
					}}
					className="h-8 min-w-0 flex-1 gap-1.5 px-2.5 text-xs sm:flex-none"
				>
					<Icons.Plus className="size-3.5 shrink-0" />
					<span className="truncate">Add Item</span>
				</Button>

				{isSaved && (
					<div className="hidden items-center gap-1.5 lg:flex">
						{isOrder && (
							<SalesPaymentProcessor
								phoneNo={zus.metaData.primaryPhone}
								selectedIds={[zus.metaData.id]}
								customerId={zus.metaData.customer.id}
								disabled={!amount || !zus.metaData.salesId}
							>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={!amount || !zus.metaData.salesId}
									className="h-8 px-2.5 text-xs"
								>
									<Icons.payment className="mr-1.5 size-3.5" />
									Pay
								</Button>
							</SalesPaymentProcessor>
						)}
						<SalesMenu
							id={zus?.metaData?.id}
							salesIds={previewId ? [previewId] : []}
							type={zus?.metaData?.type}
							trigger={
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-8 px-2.5 text-xs"
								>
									<Icons.Mail className="mr-1.5 size-3.5" />
									Email
								</Button>
							}
						>
							{isOrder ? (
								<SalesMenu.SalesEmailMenuItems />
							) : (
								<SalesMenu.QuoteEmailMenuItems />
							)}
						</SalesMenu>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => onPreview()}
							disabled={!previewId}
							className="h-8 gap-1.5 px-2.5 text-xs"
						>
							<Icons.Menu className="size-3.5" />
							<span>Preview</span>
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={(event) => void print(event)}
							disabled={salesPrint.isPrinting}
							className="h-8 px-2.5 text-xs"
						>
							{salesPrint.isPrinting ? (
								<Icons.Loader2 className="mr-1.5 size-3.5 animate-spin" />
							) : (
								<Icons.Printer className="mr-1.5 size-3.5" />
							)}
							{salesPrint.isPrinting ? "Preparing..." : "Print"}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onClick={overview}
							className="h-8 px-2.5 text-xs"
						>
							Overview
						</Button>
					</div>
				)}
				{!isSaved && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onPreview()}
						disabled={!previewId}
						className="hidden h-8 gap-1.5 px-2.5 text-xs sm:inline-flex"
					>
						<Icons.Menu className="size-3.5" />
						<span>Preview</span>
					</Button>
				)}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className={cn(
								"h-8 shrink-0 gap-1.5 px-2.5 text-xs lg:hidden",
								!isSaved && "sm:hidden",
							)}
						>
							<Icons.MoreHorizontal className="size-3.5" />
							<span>More</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-52">
						{isSaved && (
							<>
								{isOrder && (
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
								<SalesMenu
									id={zus?.metaData?.id}
									salesIds={previewId ? [previewId] : []}
									type={zus?.metaData?.type}
									trigger={
										<DropdownMenuItem onSelect={(event) => event.preventDefault()}>
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
								<DropdownMenuItem
									disabled={!previewId}
									onSelect={() => onPreview()}
								>
									<Icons.Menu className="mr-2 size-4" />
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
								<Icons.Menu className="mr-2 size-4" />
								Preview
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
				<div className="min-w-0 flex-1 sm:flex-none">
					<SalesFormSave
						type="button"
						className="h-8 w-full px-2.5 text-xs sm:w-auto"
					/>
				</div>
			</div>
		</div>
	);
}
