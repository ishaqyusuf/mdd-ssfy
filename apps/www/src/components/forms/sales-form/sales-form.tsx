import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ItemSection from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/item-section";
import { zhAddItem } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn } from "@/lib/utils";
import { FormWatcher } from "./form-watcher";
import TakeOff from "./take-off";
import { TakeoffSwitch } from "./take-off/takeoff-switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Menu as MenuIcon, Plus, Sparkles } from "lucide-react";
import { SalesFormSidebar } from "./sales-form-sidebar";
import { SalesFormSave } from "./sales-form-save";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { Button } from "@gnd/ui/button";
import { useSidebar } from "@gnd/ui/sidebar";
import { Sidebar } from "@gnd/ui/namespace";

export function SalesFormClient({ data }) {
    const zus = useFormDataStore();
    useEffectLoader(
        () => {
            zus.dotUpdate("currentTab", "invoice");
        },
        {
            wait: 200,
        },
    );

    if (!zus.formStatus || zus.currentTab != "invoice") return <></>;

    return (
        <Sidebar.Provider className="h-[calc(100vh_-_var(--header-height)_-_35px)] -mb-8 min-h-0 w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/70 ">
            <Content data={data} />
        </Sidebar.Provider>
    );
}
function Content({ data }) {
    const sPreview = useSalesPreview();
    function preview() {
        sPreview.preview(zus.metaData?.salesId, zus?.metaData?.type);
    }
    const sidebar = useSidebar();
    const hidden = !sidebar?.open;
    const zus = useFormDataStore();
    const [takeOff, takeOffChanged] = useLocalStorage("take-off", false);
    const itemCount = zus.sequence?.formItem?.length || 0;

    return (
        <>
            <Sidebar.Inset className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                <div
                    className={cn(
                        "shrink-0 flex border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur md:px-6",
                        hidden || "xl:hidden",
                    )}
                >
                    <div className="flex items-center  gap-3">
                        <div className="rounded-full bg-slate-900 p-1.5 text-white">
                            <Sparkles className="size-3.5" />
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
                        <SalesFormSave />
                        <Button
                            size="sm"
                            onClick={() => preview()}
                            className="hidden items-center gap-2 sm:flex"
                        >
                            <MenuIcon className="mr-1 h-4 w-4" />
                            Preview
                        </Button>
                        <Sidebar.Trigger />
                    </div>
                </div>
                <div className="min-h-0 flex-1">
                    <div
                        className={cn(
                            "min-h-0 h-full flex-1 transition-[margin] duration-200",
                            !hidden && "xl:mr-[22rem]",
                        )}
                    >
                        <div className="h-full overflow-y-auto px-3 pb-6 pt-4 md:px-6">
                            <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
                                <div className="rounded-2xl border border-slate-200/70 bg-white/95 shadow-sm ring-1 ring-slate-900/5">
                                    <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 md:px-5">
                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-900 md:text-base">
                                                Item Configuration
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                Add, edit, and review selected
                                                products
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
                                                {zus.sequence?.formItem?.map(
                                                    (uid) => (
                                                        <ItemSection
                                                            key={uid}
                                                            uid={uid}
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="sticky bottom-0 z-10 flex justify-end pb-2 pt-2">
                                    <div className="rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
                                        <Button
                                            onClick={() => {
                                                zhAddItem();
                                            }}
                                        >
                                            <Plus className="mr-2 size-4" />
                                            <span>Add Item</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Sidebar.Inset>

            <SalesFormSidebar className="hidden xl:flex" />
            <SalesFormSidebar className="xl:hidden" />
            <FormWatcher />
            <TakeoffSwitch {...{ takeOff, takeOffChanged }} />
        </>
    );
}


