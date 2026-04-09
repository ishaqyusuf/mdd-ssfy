import { Icons } from "@gnd/ui/icons";
import { Sidebar } from "@gnd/ui/namespace";
import { SalesMetaForm, SalesMetaTab } from "./sales-meta-form";
import { useSidebar } from "@gnd/ui/sidebar";
import { Footer } from "@/components/forms/sales-form/footer";
import { cn } from "@gnd/ui/cn";
import { ComponentProps, useState } from "react";
import { Button } from "@gnd/ui/button";
import { _modal } from "@/components/common/modal/provider";
import FormSettingsModal from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/form-settings-modal";
import { Sheet, SheetContent } from "@gnd/ui/sheet";
interface Props extends ComponentProps<typeof Sidebar> {
    opened?: boolean;
    sheetMode?: boolean;
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
}
export function SalesFormSidebar({
    className = "",
    opened = false,
    sheetMode = false,
    mobileOpen = false,
    onMobileOpenChange,
    ...props
}: Props) {
    const sb = useSidebar();
    const [tab, setTab] = useState<SalesMetaTab>("summary");

    const content = (
        <>
            <SalesPanelInner tab={tab} setTab={setTab} />
            <Sidebar.Footer className="border-t border-slate-200/80 bg-white/95 px-4 py-3">
                <Footer />
            </Sidebar.Footer>
        </>
    );

    if (sheetMode) {
        return (
            <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full max-w-[24rem] border-l border-slate-200/80 bg-white/95 p-0 backdrop-blur"
                >
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="min-h-0 flex-1 overflow-hidden">
                            <SalesPanelInner tab={tab} setTab={setTab} />
                        </div>
                        <div className="border-t border-slate-200/80 bg-white/95 px-4 py-3">
                            <Footer />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Sidebar
            side="right"
            hidden={!sb.open && !opened}
            className={cn(
                "top-[var(--header-height)] h-[calc(100vh_-_var(--header-height))] border-l border-slate-200/80 bg-white/95 backdrop-blur",
                className,
            )}
            {...props}
        >
            {content}
        </Sidebar>
    );
    // return (
    //     <div className="w-full lg:w-96 h-full lg:mb-4 lg:mt-20 lg:h-[calc(100vh-6rem)] lg:fixed lg:right-0 lg:top-0 bg-white border lg:rounded-lg border-gray-200 overflow-y-auto scrollbar-hide lg:mr-2 lg:shadow-lg">
    //         <div className="p-6 min-h-screen pb-28 space-y-6">
    //             <SalesMetaForm />
    //         </div>
    //     </div>
    // );
}

function SalesPanelInner({
    tab,
    setTab,
}: {
    tab: SalesMetaTab;
    setTab: (tab: SalesMetaTab) => void;
}) {
    return (
        <Sidebar.Content className="flex w-[22rem] min-h-0 flex-col overflow-hidden">
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
        </Sidebar.Content>
    );
}
