import Portal from "@/components/_v1/portal";
import { Menu } from "@/components/(clean-code)/menu";
import {
    BatchAssignAction,
    BatchAssignActionMenu,
} from "@/components/sheets/sales-overview-sheet/batch-assign-action";
import { useSalesOverviewItemsTab } from "@/components/sheets/sales-overview-sheet/items-tab-context";

import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { salesOverviewStore } from "../../store";

export function ProductionHeader({ children = null }) {
    const store = salesOverviewStore();
    const ctx = useSalesOverviewItemsTab();
    const { tab, setTab } = ctx;
    return (
        <>
            <Portal noDelay nodeId={"tabHeader"}>
                <div className="flex border-b py-2">
                    {children}

                    <Tabs value={tab} onValueChange={setTab}>
                        <TabsList>
                            <TabsTrigger value="production">
                                Production Items
                            </TabsTrigger>
                            <TabsTrigger value="all-items">
                                All Items
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex-1"></div>
                    <Menu label="Options">
                        <Menu.Item
                            disabled
                            SubMenu={
                                <>
                                    <Menu.Item>All Production</Menu.Item>
                                    <Menu.Item>Assigned Production</Menu.Item>
                                    <Menu.Item>Selection</Menu.Item>
                                </>
                            }
                        >
                            Complete
                        </Menu.Item>
                        <BatchAssignActionMenu />
                    </Menu>
                </div>
            </Portal>
            <BatchAssignAction />
        </>
    );
}
