"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { useMediaQuery } from "@gnd/ui/hooks";
import {
    ExteriorFrame,
    GarageDoorForm,
    InteriorDoorForm,
    DoubleDoorForm,
    BifoldDoorForm,
    LockHardwareForm,
    DecoForm,
} from "./form-sections";

export function TemplateFormTabs() {
    const isSmallScreen = useMediaQuery("(max-width: 767px)");
    const [activeTab, setActiveTab] = useState("interior");

    const tabOptions = [
        { value: "exterior", label: "Exterior Door" },
        { value: "interior", label: "Interior Trim" },
        { value: "lock", label: "Lock & Hardware" },
        { value: "deco", label: "Deco Shutters" },
    ];

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {isSmallScreen ? (
                <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose section" />
                    </SelectTrigger>
                    <SelectContent>
                        {tabOptions.map((tab) => (
                            <SelectItem key={tab.value} value={tab.value}>
                                {tab.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <TabsList className="h-auto flex-wrap">
                    {tabOptions.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            )}
            <TabsContent value="exterior" className="space-y-4">
                {activeTab === "exterior" ? <ExteriorFrame /> : null}
            </TabsContent>
            <TabsContent value="interior" className="space-y-4">
                {activeTab === "interior" ? (
                    <>
                        <GarageDoorForm />
                        <InteriorDoorForm />
                        <DoubleDoorForm />
                        <BifoldDoorForm />
                    </>
                ) : null}
            </TabsContent>
            <TabsContent value="lock">
                {activeTab === "lock" ? <LockHardwareForm /> : null}
            </TabsContent>
            <TabsContent value="deco">
                {activeTab === "deco" ? <DecoForm /> : null}
            </TabsContent>
        </Tabs>
    );
}
