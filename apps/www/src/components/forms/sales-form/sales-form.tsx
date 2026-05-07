import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ItemSection from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/item-section";
import { zhAddItem } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { cn } from "@/lib/utils";
import { Button } from "@gnd/ui/button";
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
	const itemCount = zus.sequence?.formItem?.length || 0;
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
		<div className="fixed bottom-0 left-0 right-0 top-[calc(var(--header-height)_+_35px)] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/70 p-3 md:left-[70px] sm:p-4">
			<div className="relative flex h-full min-h-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
				<main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
							<SalesFormSave />
							<Button
								size="sm"
								onClick={() => preview()}
								disabled={!previewId}
								className="hidden items-center gap-2 sm:flex"
							>
								<Icons.Menu className="mr-1 h-4 w-4" />
								Preview
							</Button>
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

					<div className="flex-1 overflow-y-auto p-3 pb-24 md:p-6 xl:pb-6">
						<div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
							<div className="rounded-2xl border border-slate-200/70 bg-white/95 shadow-sm ring-1 ring-slate-900/5">
								<div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 md:px-5">
									<div>
										<h2 className="text-sm font-semibold text-slate-900 md:text-base">
											{takeOff ? "Take Off" : "Item Configuration"}
										</h2>
										<p className="text-xs text-slate-500">
											{takeOff
												? "Take-off view"
												: "Add, edit, and review selected products"}
										</p>
									</div>
									<div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
										{itemCount} item
										{itemCount === 1 ? "" : "s"}
									</div>
								</div>

								<div className="space-y-4 p-3 md:p-5">
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

							<div className="sticky bottom-0 z-10 pointer-events-none flex justify-end pb-0 pt-2">
								<div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
									<Button
										onClick={() => {
											zhAddItem();
										}}
									>
										<Icons.Plus className="mr-2 size-4" />
										<span>Add Item</span>
									</Button>
								</div>
							</div>
						</div>
					</div>
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
