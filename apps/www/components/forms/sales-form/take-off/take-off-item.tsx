import { Menu } from "@/components/(clean-code)/menu";
import { Input } from "@gnd/ui/input";
import { Home } from "lucide-react";
import { TakeoffItemProvider, useTakeoff, useTakeoffItem } from "./context";
import { ComponentImg } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/component-img";
import { TakeOffComponent } from "./takeoff-component";
import { getTakeOffStepForms } from "@/actions/get-takeoff-step-forms";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { DoorSelect } from "./door-select";
import { NumberInput } from "@/components/currency-input";

import { useCreateContext } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/hpt-step/ctx";
import { ItemMenu } from "./item-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@gnd/ui/select";
import { AnimatedNumber } from "@/components/animated-number";
import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { composeDoor } from "@/lib/sales/compose-door";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { cn } from "@gnd/ui/cn";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import NumberFlow from "@number-flow/react";
import { updateDoorGroupForm } from "@/lib/sales/update-door-form";
import { TemplateForm } from "./template-form";

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
                    <SelectSection />
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
                    <div className="size-24 2xl:size-32 my-4">
                        <ItemImg />
                    </div>
                    <div className="flex-1 justify-between flex flex-col">
                        <TemplateForm />
                        <ItemPills />
                        {!ctx.doorUid || <HptForm />}
                    </div>
                </div>
            </div>
        </div>
    );
}
function ItemImg({}) {
    const item = useTakeoffItem();

    const Component = <ComponentImg aspectRatio={0.9} src={item.doorImg} />;
    const [open, setOpen] = useState(false);
    if (!item.section) return Component;
    return (
        <div className="flex items-center h-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger className="flex-1 hover:shadow hover:rounded-lg hover:border overflow-hidden relative">
                    {Component}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <DoorSelect setOpen={setOpen} />
                </PopoverContent>
            </Popover>
        </div>
    );
}
function SelectSection() {
    const ctx = useTakeoff();
    const { itemUid: uid, section } = useTakeoffItem();
    async function select(componentUid, templateId?) {
        const section = ctx.sections.find(
            (s) => s.componentUid == componentUid,
        );
        const template = section?.templates?.find((t) => t.id == templateId);
        const stepForms = await getTakeOffStepForms({
            configs:
                template?.data?.formSteps ||
                section.routeSequence?.map(({ uid: stepUid }) => ({
                    stepUid,
                })),
            itemUid: uid,
        });

        const zus = ctx.zus;
        // zus.dotUpdate(`sequence.formItem`, fi);
        Object.keys(zus.kvStepForm)
            .filter((k) => k.startsWith(uid))
            .map((val) => zus.removeKey(`kvStepForm.${val}`));
        const rootItemStepUid = `${uid}-${section.stepUid}`;

        zus.dotUpdate(`kvStepForm.${rootItemStepUid}`, {
            componentUid: section.componentUid,
            stepId: section.stepId,
            componentId: section.componentId,
            value: section.title,
            title: `Item Type`,
        });
        const seq = stepForms.map((a) => {
            zus.dotUpdate(`kvStepForm.${a.stepFormUid}`, a.stepForm);
            return a.stepFormUid;
        });
        if (!template) seq.unshift(`${uid}-${section.stepUid}`);
        zus.dotUpdate(`sequence.stepComponent.${uid}`, seq);
        const component = new ComponentHelperClass(
            rootItemStepUid,
            section.componentUid,
        );
        component.resetGroupItem(section.title);
    }
    return (
        <Menu
            label={
                <span className="uppercase">{section?.title || "Section"}</span>
            }
            Icon={() => (
                <>
                    {section?.img ? (
                        <div className="size-4">
                            <ComponentImg
                                aspectRatio={0.9}
                                src={section?.img}
                            />
                        </div>
                    ) : (
                        <Home className="size-4" />
                    )}
                </>
            )}
        >
            {ctx.sections.map((section) => (
                <Menu.Item
                    onClick={(e) => {
                        select(section.componentUid);
                    }}
                    SubMenu={
                        section?.templates?.length ? (
                            <>
                                <Menu.Item
                                    onClick={(e) => {
                                        select(section.componentUid);
                                    }}
                                >
                                    New
                                </Menu.Item>
                                {section?.templates?.map((template) => (
                                    <Menu.Item
                                        onClick={(e) => {
                                            select(
                                                section.componentUid,
                                                template.id,
                                            );
                                        }}
                                        key={template.id}
                                    >
                                        {template.title}
                                    </Menu.Item>
                                ))}
                            </>
                        ) : null
                    }
                    key={section.componentUid}
                >
                    {section.title}
                </Menu.Item>
            ))}
        </Menu>
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
function HptForm({}) {
    const item = useTakeoffItem();
    const [handle, setHandle] = useState("lh");
    const hptUid = [...item.stepSequence]?.reverse()?.[0];
    const ctx = useCreateContext(hptUid);
    const { itemForm, doors } = ctx;
    const path = itemForm?.groupItem?.itemIds?.[0];
    const componentClass = new ComponentHelperClass(hptUid, item.doorUid);
    const door = composeDoor(componentClass);
    const sizeForm = itemForm?.groupItem?.form?.[path];
    const size = door?.sizePrice?.find((s) => s.path == path);

    function selectSize(_path) {
        const oldPath = path;
        const size = door.sizePrice?.find((a) => a.takeOffSize == _path);

        const oldSize = door.sizePrice?.find((a) => a.path == oldPath);
        componentClass.dotUpdateItemForm("groupItem.itemIds", [size.path]);
        const groupItem = itemForm.groupItem;
        const op = itemForm.groupItem?.form?.[oldPath];
        ctx.zus.removeKey(
            `kvFormItem.${item.itemUid}.groupItem.form.${oldPath}`,
        );
        ctx.zus.dotUpdate(
            `kvFormItem.${item.itemUid}.groupItem.form.${size?.path}`,
            { ...(op || {}) },
        );
        updateDoorGroupForm(
            componentClass,
            {
                [size.path]: {
                    basePrice: size?.basePrice,
                    salesPrice: size?.salesPrice,
                    qty: op?.qty || ({} as any),
                    swing: op?.swing,
                },
            },
            null,
            false,
            {
                forceSelect: true,
            },
        );
    }
    // ctx.
    if (!door?.sizePrice?.length) return null;
    return (
        <div className="gap-2 flex justify-end">
            <table className="">
                <thead className="text-sm uppercase font-mono tracking-wider font-medium text-muted-foreground">
                    <tr>
                        <th className="p-1 px-2" align="left">
                            Size
                        </th>
                        <th className="p-1 px-2" align="left">
                            Swing
                        </th>
                        <th className="p-1 px-2" align="left">
                            Qty
                        </th>
                        <th className="p-1 px-2" align="right">
                            Unit Cost
                        </th>
                        <th className="p-1 px-2">Labor Cost</th>
                        <th className="p-1 px-2">Total Cost</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            {/* <NumberInput placeholder="Size" className="w-28" /> */}
                            <Popover>
                                <PopoverTrigger className="flex-1 overflow-hidden relative">
                                    {/* <NumberInput
                                        readOnly
                                        thousandSeparator={false}
                                        value={size?.takeOffSize}
                                        className="w-12 text-center"
                                    /> */}
                                    <Button
                                        variant="outline"
                                        className="border hover:border-border font-mono uppercase tracking-wider   font-bold h-6 px-2 w-16"
                                    >
                                        <div className="flex-1 flex">
                                            {size?.takeOffSize || "Size"}
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="start"
                                    className="w-auto p-0"
                                >
                                    <ComboboxDropdown
                                        className=""
                                        listClassName={cn()}
                                        onSelect={(data) => {
                                            selectSize(data?.label);
                                        }}
                                        headless
                                        items={door?.sizePrice?.map((c) => ({
                                            label: c.takeOffSize,
                                            id: c.path,
                                            data: c,
                                        }))}
                                        placeholder="Select"
                                        renderListItem={(item) => (
                                            <>
                                                <div className="flex w-full">
                                                    {item.item?.label}
                                                    <div className="flex-1"></div>
                                                    <Badge
                                                        className="h-5 px-1"
                                                        variant="success"
                                                    >
                                                        <NumberFlow
                                                            prefix="$"
                                                            value={
                                                                item.item?.data
                                                                    ?.salesPrice
                                                            }
                                                        />
                                                    </Badge>
                                                </div>
                                            </>
                                        )}
                                    />
                                </PopoverContent>
                            </Popover>
                        </td>
                        <td>
                            <div className="">
                                <Select
                                    value={handle}
                                    onValueChange={(e) => {
                                        setHandle(e);
                                        console.log(e);
                                    }}
                                >
                                    <SelectTrigger className="h-6 uppercase">
                                        {handle}
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lh">LH</SelectItem>
                                        <SelectItem value="rh">RH</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </td>
                        <td>
                            <NumberInput className="w-12 text-center" />
                        </td>
                        <td align="right">
                            <AnimatedNumber
                                value={sizeForm?.pricing?.unitPrice}
                            />
                        </td>
                        <td align="right">
                            <AnimatedNumber
                                value={sizeForm?.pricing?.totalPrice || 0}
                            />
                        </td>
                        <td align="right">
                            <AnimatedNumber
                                value={sizeForm?.pricing?.totalPrice || 0}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
function Size({}) {}
