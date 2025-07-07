import { useEffect, useState } from "react";
import {
    getDoorSizesUseCase,
    getDykeStepTitlesOptionUseCase,
    getMouldingSpeciesUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { LegacyDykeFormStepType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import stepHelpers from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/step-helper";
import { LabelValue } from "@/app/(clean-code)/type";
import { Icons } from "@/components/_v1/icons";
import { Search } from "@/components/(clean-code)/search";
import { cn } from "@/lib/utils";
import { useFieldArray, useForm } from "react-hook-form";

import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { IStepProducts } from "../../../../../../../(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products";
import { ProductImage } from "../../../../../../../(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products/product";

type TabType = "general" | "price" | "deleted" | "restore" | "step";
export function useStepComponentModal(
    ctx: LegacyDykeFormStepType,
    item: IStepProducts[number],
) {
    const mainForm = ctx.mainCtx.form;
    const { ...defaultValues } = item;
    if (!item.id) defaultValues.product.title = "";
    if (!defaultValues.meta.stepSequence?.length)
        defaultValues.meta.stepSequence = [{}] as any;
    const form = useForm({
        defaultValues,
    });
    const stepS = useFieldArray({
        control: form.control,
        keyName: "_id",
        name: "meta.stepSequence",
    });
    const [url, svg, img] = form.watch([
        "product.meta.url",
        "product.meta.svg",
        "product.img",
    ]);
    const moulding = useMouldingSpecies(ctx.isMoulding, form, item);
    const [tab, setTab] = useState<TabType>();
    function copyProduct(product: IStepProducts[number]) {
        // console.log(product);
        stepHelpers.copyProduct(form, ctx.isRoot, product);
        setTab("general");
    }
    const door = useDoor(ctx.isDoor);
    async function save() {
        await stepHelpers.componentDepsForm(ctx, form.getValues());
    }
    const _ctx = {
        species: moulding.species,
        save,
        form,
        tab,
        setTab,
        stepS,
        onUpload: (assetId, path?) => stepHelpers.onUpload(form, assetId, path),
        url,
        svg,
        img,
        door,
        ComponentList,
    };
    function PriceInfo({ prod }: { prod: IStepProducts[number] }) {
        let priceLen = Object.values(prod.door?.meta?.doorPrice || {}).filter(
            Boolean,
        ).length;
        if (priceLen)
            return (
                <div id="" className="absolute right-0 top-0 flex ">
                    <Label>{priceLen}</Label>
                    <Icons.dollar className="size-4 text-muted-foreground" />
                </div>
            );
        return null;
    }
    function ComponentList({ isRestore }: { isRestore?: boolean }) {
        const ItemRender = ({ item }) => {
            const k = `restores.${item.uid}` as any;
            const [selected, setSelected] = useState(form.getValues(k));
            // const watchRestores = form.watch(`restores.${item.uid}` as any);
            return (
                <button
                    onClick={() => {
                        // console.log("...");
                        if (isRestore) {
                            const val = !selected;
                            form.setValue(k, val);
                            setSelected(val);
                        } else {
                            copyProduct(item);
                        }
                    }}
                    key={item.id}
                    className={cn(
                        "relative flex flex-col items-center hover:border hover:shadow-sm",
                        selected && isRestore && "border  border-purple-600",
                    )}
                >
                    {/* {restores[item.uid] && tab == "restore" && (
                            <div className="absolute left-0 m-2">
                                <CheckCircle2Icon className="w-6 h-6 text-purple-500" />
                            </div>
                        )} */}
                    <PriceInfo prod={item} />
                    <div className="h-16s w-2/3 overflow-hidden">
                        <ProductImage aspectRatio={1 / 1} item={item} />
                    </div>
                    <div className="">
                        <span className=" text-sm">{item.product.title}</span>
                    </div>
                </button>
            );
        };
        return (
            <Search
                items={ctx.deletedComponents}
                searchText={(item) => item.product.title}
                itemKey={"id"}
                Item={ItemRender}
            >
                <Search.SearchInput label="Search" />
                <ScrollArea className="mt-4 h-[450px]">
                    <div className="grid grid-cols-3 gap-2">
                        <Search.RenderItem />
                    </div>
                </ScrollArea>
            </Search>
        );
    }
    return _ctx;
}
function useMouldingSpecies(isMoulding, form, item) {
    const [species, setSpecies] = useState<string[]>([]);

    useEffect(() => {
        if (isMoulding)
            getMouldingSpeciesUseCase().then((resp) => {
                setSpecies(resp);
                const def: any = {};
                resp?.map((s) => (def[s as any] = true));
                if (!item.id) {
                    form.setValue(`product.meta.mouldingSpecies`, def);
                }
            });
    }, []);
    return { species };
}
export function useDoor(isDoor = true) {
    const [heights, setHeight] = useState({
        "6-8": [],
        "7-0": [],
        "8-0": [],
    });
    const heightList = Object.keys(heights);
    // const [heightList, setHeightList] = useState(_heightList);
    const [priceTab, setPriceTab] = useState<string>();
    const [sizeList, setSizeList] = useState<string[]>([]);
    const [stepTitles, setStepTitle] = useState<LabelValue[]>([]);
    useEffect(() => {
        setSizeList(heights[priceTab] || []);
    }, [priceTab]);
    useEffect(() => {
        if (isDoor) {
            (async () => {
                let d: any = {};
                let _tab = null;
                await Promise.all(
                    Object.keys(heights).map(async (height) => {
                        if (!_tab) _tab = height;
                        const result = await getDoorSizesUseCase(height); //.then((result) => {
                        // console.log(result);
                        d[height] = Array.from(
                            new Set(result.map((s) => s.dimFt)),
                        );
                        // });/
                    }),
                );
                // console.log(d);
                setHeight(d);
                setPriceTab(_tab);
                getDykeStepTitlesOptionUseCase().then((resp) => {
                    setStepTitle(resp);
                });
            })();
        }
    }, []);
    return {
        priceTab,
        heights,
        sizeList,
        heightList,
        stepTitles,
    };
}
