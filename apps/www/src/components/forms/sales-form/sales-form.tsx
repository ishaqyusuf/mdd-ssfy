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

    const [takeOff, takeOffChanged] = useLocalStorage("take-off", false);
    if (!zus.formStatus || zus.currentTab != "invoice") return <></>;

    return (
        <div className="min-h-screen w-full bg-white dark:bg-primary-foreground p-4 lg:flex xl:gap-4 xl:p-8">
            <TakeoffSwitch {...{ takeOff, takeOffChanged }} />
            <div className="flex-1">
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
            <div className="relative lg:w-[350px]">
                <div className="sticky top-16 flex w-full flex-col">
                    <div className="">
                        <SalesMetaForm />
                    </div>
                </div>
            </div>
            <FormWatcher />
        </div>
    );
}
