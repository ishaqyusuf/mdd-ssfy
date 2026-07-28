import { Icons } from "@gnd/ui/icons";
import { SalesMetaForm, SalesMetaTab } from "./sales-meta-form";
import { Footer } from "@/components/forms/sales-form/footer";
import { cn } from "@gnd/ui/cn";
import { useState } from "react";
import { Button } from "@gnd/ui/button";
import { _modal } from "@/components/common/modal/provider";
import FormSettingsModal from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/form-settings-modal";

interface Props {
	mobileOpen?: boolean;
	onClose?: () => void;
}

export function SalesFormSidebar({
	mobileOpen = false,
	onClose,
}: Props) {
	const [tab, setTab] = useState<SalesMetaTab>("summary");

	return (
		<>
			{mobileOpen ? (
				<button
					type="button"
					aria-label="Close sales panel"
					className="fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-[1px] xl:hidden"
					onClick={onClose}
				/>
			) : null}

			<aside
				className={cn(
					"fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-slate-200/80 bg-white shadow-2xl transition-transform duration-300 xl:static xl:z-auto xl:h-full xl:w-[420px] xl:max-w-none xl:translate-x-0 xl:shadow-none",
					mobileOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0",
				)}
			>
				<div className="flex h-full min-h-0 flex-col">
					<div className="space-y-3 border-b border-slate-200/80 px-4 py-3">
						<div className="flex items-center gap-2">
							<p className="text-[11px] uppercase tracking-wide text-slate-500">
								Sales Panel
							</p>
							<div className="flex-1" />
							<Button
								size="icon"
								variant="ghost"
								className="size-7"
								onClick={() => _modal.openModal(<FormSettingsModal />)}
								title="Step Settings"
							>
								<Icons.Settings2 className="size-4" />
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="size-7 xl:hidden"
								onClick={onClose}
								title="Close Sales Panel"
							>
								<Icons.X className="size-4" />
							</Button>
						</div>

						<p className="text-sm font-semibold text-slate-900">
							Summary And Actions
						</p>

						<div className="rounded-lg bg-slate-100 p-1">
							<div className="grid grid-cols-2 gap-1">
								{(["summary", "history"] as SalesMetaTab[]).map((tabName) => (
									<Button
										key={tabName}
										size="sm"
										variant="ghost"
										onClick={() => setTab(tabName)}
										className={cn(
											"h-8 rounded-md text-xs font-semibold capitalize",
											tab === tabName
												? "bg-white text-slate-900 shadow-sm"
												: "text-slate-600 hover:text-slate-900",
										)}
									>
										{tabName}
									</Button>
								))}
							</div>
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
						<SalesMetaForm tab={tab} />
					</div>

					<div className="sticky bottom-0 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur">
						<Footer />
					</div>
				</div>
			</aside>
		</>
	);
}
