import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import ItemSection from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/item-section";
import { zhAddItem } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { Icons } from "@/components/_v1/icons";
import Button from "@/components/common/button";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn } from "@/lib/utils";

import { SalesMetaForm } from "./sales-meta-form";
import { FormWatcher } from "./form-watcher";
import TakeOff from "./take-off";
import { TakeoffSwitch } from "./take-off/takeoff-switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SalesFormSidebar } from "./sales-form-sidebar";

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
    const [takeOff, takeOffChanged] = useLocalStorage("take-off", false);
    if (!zus.formStatus || zus.currentTab != "invoice") return <></>;

    return (
        <div className="min-h-screen w-full bg-white dark:bg-primary-foreground  xl:gap-4">
            <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">
                    Invoice Builder
                </h1>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSidebarOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Menu className="h-4 w-4" />
                    Invoice Details
                </Button>
            </div>
            <div className="flex">
                <div className="flex-1 lg:mr-96">
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
                <div className="hidden lg:block">
                    <SalesFormSidebar />
                </div>
                {sidebarOpen && (
                    <div className="lg:hidden fixed inset-0 z-50 flex">
                        <div
                            className="flex-1 bg-black bg-opacity-50"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <div className="w-full sm:w-[70vw] bg-white">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">
                                    Invoice Details
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <SalesFormSidebar
                                onClose={() => setSidebarOpen(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
            {/* <div className="relative lg:w-[350px]">
                <div className="sticky top-16 flex w-full flex-col">
                    <div className="">
                        <SalesMetaForm />
                    </div>
                </div>
            </div> */}
            <FormWatcher />
            <TakeoffSwitch {...{ takeOff, takeOffChanged }} />
        </div>
    );
}
