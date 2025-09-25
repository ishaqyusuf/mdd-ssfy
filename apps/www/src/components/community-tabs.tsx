"use client";

// import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResetInventories } from "./reset-inventories";
import { Tabs } from "@gnd/ui/custom/tabs";
export function CommunityTabs() {
    function CustomTab({ value, children }) {
        return (
            <Link href={value}>
                <Tabs.Item value={value}>{children}</Tabs.Item>
            </Link>
        );
    }
    const path = usePathname();

    return (
        <div className="flex gap-4 items-center">
            <Tabs value={path}>
                <Tabs.Items className="px-4">
                    <CustomTab value="/inventory">Inventory</CustomTab>,
                    <CustomTab value="/inventory/variants">
                        All Variants
                    </CustomTab>
                    <CustomTab value="/inventory/inbounds">Inbounds</CustomTab>
                    <CustomTab value="/inventory/stocks">
                        Stock Movements
                    </CustomTab>
                    <CustomTab value="/inventory/categories">
                        Categories
                    </CustomTab>
                    <CustomTab value="/inventory/imports">Imports</CustomTab>,
                </Tabs.Items>
                {/* <TabsList>
                                <TabsTrigger value="doors">Doors</TabsTrigger>
                                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                            </TabsList>
                            <TabsContent value="doors">
                                <Content itemStepUid={itemStepUid} />
                            </TabsContent> */}
            </Tabs>

            {/* <div className="flex-1"></div> */}
            {/* <ResetInventories /> */}
        </div>
    );
}

