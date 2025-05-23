"use client";
import { useRolesParams } from "@/hooks/use-roles-params";
import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import Button from "@/components/common/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { RolesTab } from "./roles-tab";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { RoleFormContext } from "@/components/hrm/role-form-context";
import { RoleForm } from "@/components/forms/role-form";
import { cn } from "@gnd/ui/cn";
export default function RolesProfilesSheet({}) {
    const { params, setParams } = useRolesParams();
    const size = params.roleForm ? "5xl" : "xl";
    const primaryTab = params.primaryTab;
    return (
        <CustomSheet
            floating
            rounded
            size={size}
            open={!!params.viewRoles}
            onOpenChange={(e) => setParams(null)}
            sheetName="roles"
        >
            <SheetHeader>
                <SheetTitle>Roles</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 overflow-hidden">
                <div
                    className={cn(
                        "overflow-hidden flex flex-col flex-1",
                        params.roleForm && "pr-4",
                    )}
                >
                    <Tabs
                        defaultValue="roles"
                        value={primaryTab}
                        onValueChange={(e) => {
                            setParams({
                                primaryTab: e,
                            });
                        }}
                    >
                        <div className="flex">
                            <TabsList className="">
                                <TabsTrigger value="roles">Roles</TabsTrigger>
                                <TabsTrigger value="profiles">
                                    Profiles
                                </TabsTrigger>
                            </TabsList>
                            <div
                                className="flex-1 flex justify-end"
                                id="tabActions"
                            ></div>
                        </div>
                    </Tabs>
                    <ScrollArea className="flex-1">
                        <Tabs defaultValue="roles" value={primaryTab}>
                            <TabsContent className="min-h-screen" value="roles">
                                <RolesTab />
                            </TabsContent>
                        </Tabs>
                    </ScrollArea>
                </div>
                {!params.roleForm || (
                    <ScrollArea className="flex-1 border-l pl-4">
                        <RoleFormContext>
                            <RoleForm />
                        </RoleFormContext>
                    </ScrollArea>
                )}
            </div>
        </CustomSheet>
    );
}
