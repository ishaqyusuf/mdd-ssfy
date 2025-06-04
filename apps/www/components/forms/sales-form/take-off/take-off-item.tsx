import { Input } from "@gnd/ui/input";
import { TakeoffItemProvider, useTakeoff, useTakeoffItem } from "./context";
import { TakeOffComponent } from "./takeoff-component";
import { ItemMenu } from "./item-menu";
import { TemplateForm } from "./template-form";
import { SectionSelector } from "./section-selector";
import { DoorDisplay } from "./door-display";
import { HptForm } from "./hpt-form";
import { MouldingAndService } from "../moulding-and-service";
import { ShelfSection } from "../shelf";

interface Props {
    uid: string;
}
export function TakeOffItem({ uid }: Props) {
    const ctx = useTakeoff();
    return (
        <TakeoffItemProvider args={[uid]}>
            <TakeOffItemContent />
        </TakeoffItemProvider>
    );
}
function TakeOffItemContent({}) {
    const ctx = useTakeoffItem();
    const formItem = ctx?.itemForm;
    return (
        <div className="border border-x-transparent hover:border-x-border hover:shadow hover:rounded flex flex-col">
            <div className="">
                <div className="flex">
                    <SectionSelector />
                    <Input
                        value={formItem?.title}
                        onChange={(e) => {
                            ctx.zus.updateFormItem(
                                ctx.itemUid,
                                "title",
                                e.target.value?.toLocaleUpperCase(),
                            );
                        }}
                        className="h-8 uppercase font-mono"
                        placeholder="Takeoff title"
                    />
                    <ItemMenu />
                </div>
                <div className="flex px-4 pb-4">
                    <DoorDisplay />

                    {!ctx?.section?.title || (
                        <div className="flex-1 justify-between flex flex-col">
                            <TemplateForm />
                            <ItemPills />
                            {!ctx.doorUid || <HptForm />}
                            {ctx?.itemType == "MOULDING" ||
                            ctx.itemType == "SERVICE" ? (
                                <MouldingAndService />
                            ) : null}
                            {ctx?.itemType != "SHELF" || <ShelfSection />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ItemPills() {
    const takeoffCtx = useTakeoff();
    const itemCtx = useTakeoffItem();

    return (
        <div className="flex gap-2 flex-wrap py-4">
            {itemCtx.stepSequence
                ?.filter((a, i) => i > 0)
                .map((c, i) => <TakeOffComponent key={i} itemStepUid={c} />)}
        </div>
    );
}

function Size({}) {}
