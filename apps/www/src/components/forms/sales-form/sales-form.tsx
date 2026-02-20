import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ItemSection from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/item-section";
import { zhAddItem } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { Icons } from "@/components/_v1/icons";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn } from "@/lib/utils";
import { FormWatcher } from "./form-watcher";
import TakeOff from "./take-off";
import { TakeoffSwitch } from "./take-off/takeoff-switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Menu as MenuIcon, X } from "lucide-react";
import { useState } from "react";
import { SalesFormSidebar } from "./sales-form-sidebar";
import { useSalesSummaryToggle } from "@/store/invoice-summary-toggle";
import { SalesFormSave } from "./sales-form-save";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { Button } from "@gnd/ui/button";
import { SidebarProvider } from "@gnd/ui/sidebar";
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

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { hidden } = useSalesSummaryToggle();
    const sPreview = useSalesPreview();
    const [takeOff, takeOffChanged] = useLocalStorage("take-off", false);
    if (!zus.formStatus || zus.currentTab != "invoice") return <></>;
    function preview() {
        sPreview.preview(zus.metaData?.salesId, zus?.metaData?.type);
    }
    return (
        <Sidebar.Provider className="min-h-screen w-full bg-white dark:bg-primary-foreground  xl:gap-4">
            <Sidebar.Inset>
                <div
                    className={cn(
                        "bg-white border-b border-gray-200 p-4 flex items-center gap-4",
                        hidden || "xl:hidden",
                    )}
                >
                    <h1 className="text-xl capitalize font-semibold text-gray-900">
                        {data?.order?.type} Builder
                    </h1>
                    <div className="flex-1"></div>
                    <SalesFormSave />
                    <Button
                        size="sm"
                        onClick={() => preview()}
                        className="flex items-center gap-2"
                    >
                        <MenuIcon className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                    {/* <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSidebarOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <MenuIcon className="h-4 w-4" />
                        {zus?.metaData?.type === "quote"
                            ? "Quote Detail"
                            : "Invoice Detail"}
                    </Button> */}
                    <Sidebar.Trigger></Sidebar.Trigger>
                </div>
                <div className="flex">
                    <div className={cn("flex-1", !hidden && "xl:mr-96s")}>
                        {takeOff ? (
                            <TakeOff />
                        ) : (
                            <div className={cn("hiddens")}>
                                {zus.sequence?.formItem?.map((uid) => (
                                    <ItemSection key={uid} uid={uid} />
                                ))}
                            </div>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Button
                                onClick={() => {
                                    zhAddItem();
                                }}
                            >
                                <Icons.add className="mr-2 size-4" />
                                <span>Add</span>
                            </Button>
                        </div>
                    </div>
                    {/* <div className={cn("hidden", !hidden && "xl:block")}>
                        <SalesFormSidebar />
                    </div> */}
                </div>
            </Sidebar.Inset>

            <SalesFormSidebar
                opened
                className="hidden xl:flex"
                collapsible="none"
            />
            <SalesFormSidebar className="xl:hidden" />
            <FormWatcher />
            <TakeoffSwitch {...{ takeOff, takeOffChanged }} />
        </Sidebar.Provider>
    );
}
