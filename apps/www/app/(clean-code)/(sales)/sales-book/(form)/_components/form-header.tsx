import { DatePicker } from "@/components/_v1/date-range-picker";
import { Menu } from "@/components/(clean-code)/menu";
import Button from "@/components/common/button";
import { _modal } from "@/components/common/modal/provider";
import { SalesFormEmailMenu } from "@/components/forms/sales-form/sales-form-email-menu";
import { SalesFormPrintMenu } from "@/components/forms/sales-form/sales-form-print-menu";
import { SalesFormSave } from "@/components/forms/sales-form/sales-form-save";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";

import { Label } from "@gnd/ui/label";

import { useFormDataStore } from "../_common/_stores/form-data-store";
import { Sticky } from "../_hooks/use-sticky";
import FormSettingsModal from "./modals/form-settings-modal";

export function FormHeader({ sticky }: { sticky: Sticky }) {
    const zus = useFormDataStore();
    const { isFixed, containerRef } = sticky;
    const tabs = [
        { name: "info", title: "Sales Info", default: true },
        { name: "invoice", title: "Invoice Builder" },
        { name: "address", title: "Customer Info" },
        // { name: "info", title: "Customer Info" },
    ];

    function isActive(tab) {
        return (!zus.currentTab && tab.default) || zus.currentTab == tab.name;
    }
    const ctx = useSalesOverviewQuery();

    return (
        <div
            style={
                isFixed
                    ? {
                          left: `${
                              containerRef?.current?.getBoundingClientRect()
                                  ?.left
                          }px`,
                          width: `${
                              containerRef?.current?.getBoundingClientRect()
                                  ?.width
                          }px`,
                          //   right: `${
                          //       containerRef?.current?.getBoundingClientRect()
                          //           ?.right
                          //   }px`,
                      }
                    : {}
            }
            className={cn(
                "mb-4 flex items-center border-b",
                isFixed &&
                    "border-2s sborder-muted-foreground/50 rounded-fulls fixed top-[55px]  z-10 overflow-hidden  border bg-background shadow-xl",
            )}
        >
            <div className="">
                {tabs.map((tab) => (
                    <Button
                        key={tab.name}
                        size="default"
                        onClick={(e) => {
                            zus.dotUpdate("currentTab", tab.name as any);
                        }}
                        className={cn(
                            "rounded-none  border-b-2 border-transparent text-muted-foreground",
                            isActive(tab)
                                ? "border-primary bg-muted text-primary"
                                : "",
                            tab.name == "address" && "lg:hidden",
                        )}
                        variant="ghost"
                    >
                        {tab.title}
                    </Button>
                ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-4 px-4 py-2">
                <CreatedDate />
                <Button
                    size="xs"
                    icon="settings"
                    onClick={() => {
                        _modal.openSheet(<FormSettingsModal />);
                    }}
                    variant="outline"
                >
                    <span className="">Settings</span>
                </Button>

                <Button
                    size="xs"
                    disabled={!zus.metaData.id}
                    onClick={() => {
                        ctx.open2(
                            zus.metaData?.salesId,
                            zus.metaData.type as any,
                        );
                    }}
                >
                    <span className="">Overview</span>
                </Button>
                <div className="flex">
                    <Menu Icon={MenuIcon}>
                        <SalesFormSave type="menu" and="close" />
                        <SalesFormSave type="menu" and="new" />
                        {/* <Menu.Item onClick={() => save("close")}>
                            Save & Close
                        </Menu.Item>
                        <Menu.Item onClick={() => save("new")}>
                            Save & New
                        </Menu.Item> */}
                        <Menu.Item>Copy</Menu.Item>
                        <Menu.Item disabled>Move To Sales</Menu.Item>
                        <Menu.Item disabled>Move To Quotes</Menu.Item>
                    </Menu>
                    <SalesFormSave type="button" />
                </div>

                <Menu>
                    <SalesFormPrintMenu />
                    <SalesFormEmailMenu />
                </Menu>
            </div>
        </div>
    );
}
function CreatedDate() {
    const zus = useFormDataStore();

    return (
        <div className="inline-flex items-center space-x-2">
            <Label>Date:</Label>
            <DatePicker
                // disabled={(date) => date > new Date()}
                setValue={(e) => {
                    // form.setValue("order.createdAt", e)
                    zus.dotUpdate("metaData.createdAt", e);
                }}
                className="h-8 w-auto"
                value={zus.metaData?.createdAt}
            />
        </div>
    );
}
