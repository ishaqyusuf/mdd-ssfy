import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useLegacyDykeFormStep } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import stepHelpers from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/step-helper";
import { DykeStep } from "@/app/(v2)/(loggedIn)/sales-v2/type";
import Btn from "@/components/_v1/btn";
import {
    DeleteRowAction,
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import { Icons } from "@/components/_v1/icons";
import { Info } from "@/components/_v1/info";
import Money from "@/components/_v1/money";
import Img from "@/components/(clean-code)/img";
import { PlaceholderImage } from "@/components/placeholder-image";
import { env } from "@/env.mjs";
import { cn, safeFormText } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dot } from "lucide-react";
import SVG from "react-inlinesvg";

import { AspectRatio } from "@gnd/ui/aspect-ratio";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

import { IStepProducts } from ".";
import { useDykeCtx, useDykeItemCtx } from "../../../../_hooks/form-context";

import DoorMenuOption from "./door-menu-option";

interface Props {
    item: IStepProducts[number] & { _selected: boolean };
    select;
    loadingStep;
    isMultiSection;
    isRoot;
    // stepForm: DykeStep;
    // stepIndex;
    openStepForm;
    // setStepProducts;
    deleteStepItem;
    className?: string;
    itemIndex;
    // products;
}
export function StepProduct({
    item,
    select,
    loadingStep,
    isMultiSection,
    deleteStepItem,
    // stepForm,
    // stepIndex,
    openStepForm,
    // setStepProducts,
    className,
    isRoot,
    itemIndex,
}: // products,
Props) {
    const ctx = useDykeItemCtx();
    const formCtx = useDykeCtx();
    const stepCtx = useLegacyDykeFormStep();
    const {
        components: products,
        setComponents: setStepProducts,
        step: stepForm,
    } = stepCtx;
    const selected = isMultiSection
        ? ctx.multi.watchItemSelected(safeFormText(item.product?.title))
        : false;
    const itemData = ctx.get.itemArray();

    const doorPriceCount = Object.entries(
        item.product?.meta?.doorPrice || {},
    ).filter(([k, v]) => {
        return v > 0 && k?.endsWith(itemData.item?.housePackageTool?.height);
    }).length;
    const [menuOpen, menuOpenChange] = useState(false);
    const [editPrice, setEditPrice] = useState(false);
    useEffect(() => {
        if (!menuOpen) setEditPrice(false);
    }, [menuOpen]);
    const [price, setPrice] = useState();
    const [saving, startSaving] = useTransition();
    const { dependencies, dependenciesUid } = stepCtx;

    async function savePrice() {
        startSaving(async () => {
            // console.log(item.uid);
            // await updateStepItemPrice({
            //     stepProductUid: item.uid,
            //     price: Number(price),
            //     dykeStepId: stepForm.step.id,
            //     dependenciesUid,
            // });
            stepCtx.reloadComponents();

            menuOpenChange(false);
        });
    }
    const onEditPrice = async (e) => {
        e.preventDefault();
        setPrice(item._metaData.basePrice);
        setEditPrice(true);
    };
    function Content({ onClick }) {
        return (
            <>
                <CardHeader
                    onClick={onClick}
                    className="realtive flex-1 border-b p-0 py-4"
                >
                    <div className="absolute left-0 top-0 z-10 -m-4">
                        {item.productCode && (
                            <Badge variant="outline">#{item.productCode}</Badge>
                        )}
                    </div>
                    <div className="absolute right-0 top-0 z-10 flex gap-4 p-2 px-4">
                        {item.meta?.stepSequence?.length ? (
                            <Dot className="h-8 w-8 text-cyan-600" />
                        ) : null}
                        {stepForm.step.title == "Door" ? (
                            <span className="inline-flex space-x-1 text-muted-foreground">
                                {/* <Icons.dollar className="size-4" /> */}
                                <span>
                                    {doorPriceCount} {" price found"}
                                </span>
                            </span>
                        ) : (
                            item._metaData.basePrice > 0 && (
                                <div className="flex">
                                    {formCtx.adminMode && (
                                        <Badge variant="secondary">
                                            <Money
                                                value={item._metaData.basePrice}
                                            />
                                        </Badge>
                                    )}
                                    <Badge variant="destructive">
                                        <Money value={item._metaData.price} />
                                    </Badge>
                                </div>
                            )
                        )}
                    </div>

                    <ProductImage item={item} />
                    {/* <div className="absolute top-0"></div> */}
                </CardHeader>
                <CardContent
                    onClick={onClick}
                    className="inline-flex items-center justify-between space-y-1.5 p-2"
                >
                    {/* <span>{item.deletedAt ? "yes" : "no"}</span> */}
                    <CardTitle className="line-clamp-1s text-sm">
                        {isRoot
                            ? item.product?.value || item.product?.title
                            : item.product?.title}
                    </CardTitle>
                </CardContent>
            </>
        );
    }
    const [showProceed, setShowProceed] = useState(false);
    // const [selected,]
    // const [] =

    useEffect(() => {
        if (showProceed) {
            setTimeout(() => {
                setShowProceed(false);
            }, 3000);
        }
    }, [showProceed]);
    function MouldingContent() {
        return (
            <>
                <Content
                    onClick={() => {
                        if (stepCtx?.hasSelection) {
                            stepCtx.toggleSelection(item, itemIndex);
                            return;
                        }

                        setShowProceed(true);
                        if (!loadingStep && !menuOpen) select(selected, item);
                    }}
                />

                {showProceed && (
                    <div className="absolute">
                        <Button
                            onClick={() => {
                                select(false);
                            }}
                            size="sm"
                        >
                            Proceed
                        </Button>
                    </div>
                )}
            </>
        );
    }
    return (
        <Card
            className={cn(
                "overflow-hiddens relative flex size-full flex-1 flex-col rounded-lg border-muted-foreground/10",
                className,
                selected ? "border-green-500 hover:border-green-500" : "",
                loadingStep ? "cursor-not-allowed" : "cursor-pointer",
            )}
        >
            {/* {formCtx.superAdmin && <batchCtx.CheckBox uid={item.uid} />} */}
            {/* <div>{JSON.stringify(stepCtx.selections || {})}</div> */}
            <div
                className={cn(
                    !menuOpen && "hidden",
                    stepCtx.hasSelection || !formCtx.superAdmin
                        ? ""
                        : "absolute right-0 top-0  z-20 -m-4 rounded-lg bg-white shadow-xl group-hover:flex",
                    // !formCtx.superAdmin ? "hidden" : "group-hover:flex"
                )}
            >
                <Menu open={menuOpen} onOpenChanged={menuOpenChange}>
                    {editPrice ? (
                        <div className="grid gap-2 p-2">
                            <div
                                className={cn(
                                    "grid",
                                    dependencies.length && "border-b pt-2",
                                    dependencies.length > 1
                                        ? "grid-cols-2"
                                        : "",
                                )}
                            >
                                {dependencies.map((i) => (
                                    <Info key={i.label} label={i.label}>
                                        {i.value}
                                    </Info>
                                ))}
                            </div>
                            <div className="grid gap-2">
                                <Label>Price</Label>
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) =>
                                        setPrice(e.target.value as any)
                                    }
                                />
                            </div>
                            <div className="flex justify-end">
                                <Btn
                                    onClick={savePrice}
                                    isLoading={saving}
                                    size="sm"
                                >
                                    Save
                                </Btn>
                            </div>
                        </div>
                    ) : (
                        <>
                            <MenuItem
                                onClick={() => openStepForm(item)}
                                Icon={Icons.edit}
                            >
                                Edit
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    stepCtx.toggleSelection(item, itemIndex);
                                }}
                                Icon={Icons.check}
                            >
                                Select
                            </MenuItem>

                            {stepForm.step.title == "Door" ? (
                                <DoorMenuOption
                                    prod={item}
                                    setStepProducts={setStepProducts}
                                    products={products}
                                />
                            ) : (
                                <MenuItem
                                    onClick={onEditPrice}
                                    Icon={Icons.dollar}
                                >
                                    Change Price
                                </MenuItem>
                            )}
                            <DeleteRowAction
                                menu
                                noToast
                                row={item}
                                action={deleteStepItem}
                            />
                        </>
                    )}
                </Menu>
            </div>
            <div
                className={cn(
                    !stepCtx?.hasSelection && "hidden",
                    "absolute left-0 top-0 bg-white",
                )}
            >
                <Checkbox checked={stepCtx.selections?.[item.uid]?.selected} />
                {/* <Icons.check className="text-green-600 size-4" /> */}
            </div>
            <span className="sr-only">
                {isRoot
                    ? item.product?.value || item.product?.title
                    : item.product?.title}
            </span>
            {stepForm.step?.title == "Moulding" ? (
                <MouldingContent />
            ) : (
                <Content
                    onClick={() => {
                        if (stepCtx?.hasSelection) {
                            stepCtx.toggleSelection(item, itemIndex);
                            return;
                        }
                        if (!loadingStep && !menuOpen) select(selected, item);
                    }}
                />
            )}
        </Card>
    );
}
interface ProductImageProps {
    item?;
    aspectRatio?;
}
export function ProductImage({ item, aspectRatio = 4 / 2 }: ProductImageProps) {
    const src = item.product?.img || item?.product?.meta?.cld;
    const svg = (item.product?.meta as any)?.svg;
    const url = item.product?.meta?.url;
    return (
        <Img
            src={src}
            aspectRatio={
                src || url ? (item.isDoor ? 4 / 4 : aspectRatio) : aspectRatio
            }
            alt={item.product?.title}
            svg={svg}
        />
    );
    return (
        <motion.div
            className="relative flex h-full flex-1 flex-col items-center justify-center space-y-2 "
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {item.product?.img || item?.product?.meta?.cld ? (
                <AspectRatio ratio={item.isDoor ? 4 / 4 : aspectRatio}>
                    <Image
                        src={`${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/${
                            item.product?.img || item?.product?.meta?.cld
                        }`}
                        alt={item.product?.title}
                        className="object-contain"
                        // sizes="(min-width: 1024px) 10vw"
                        fill
                        loading="lazy"
                    />
                </AspectRatio>
            ) : (item.product?.meta as any)?.svg ? (
                <AspectRatio ratio={1}>
                    <SVG className="" src={item.product?.meta?.svg} />
                </AspectRatio>
            ) : item.product?.meta?.url ? (
                <AspectRatio ratio={item.isDoor ? 4 / 4 : aspectRatio}>
                    <div className="absolute inset-0 bg-red-400 bg-opacity-0"></div>
                    <object
                        data={item.product?.meta?.url}
                        type={"image/svg+xml"}
                        className=""
                        id="img"
                    />
                </AspectRatio>
            ) : (
                <PlaceholderImage className="rounded-none" asChild />
            )}
        </motion.div>
    );
}
