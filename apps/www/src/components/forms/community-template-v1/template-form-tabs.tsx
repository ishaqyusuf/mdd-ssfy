"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
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
    return (
        <Tabs defaultValue="interior" className="space-y-4">
            <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="exterior">Exterior Door</TabsTrigger>
                <TabsTrigger value="interior">Interior Trim</TabsTrigger>
                <TabsTrigger value="lock">Lock & Hardware</TabsTrigger>
                <TabsTrigger value="deco">Deco Shutters</TabsTrigger>
            </TabsList>
            <TabsContent value="exterior" className="space-y-4">
                <ExteriorFrame />
            </TabsContent>
            <TabsContent value="interior" className="space-y-4">
                <GarageDoorForm />
                <InteriorDoorForm />
                <DoubleDoorForm />
                <BifoldDoorForm />
            </TabsContent>
            <TabsContent value="lock">
                <LockHardwareForm />
            </TabsContent>
            <TabsContent value="deco">
                <DecoForm />
            </TabsContent>
        </Tabs>
    );
}
