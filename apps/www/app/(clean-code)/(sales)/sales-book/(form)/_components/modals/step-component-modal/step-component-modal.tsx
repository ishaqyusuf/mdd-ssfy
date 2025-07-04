"use client";

import RenderForm from "@/_v2/components/common/render-form";
import { LegacyDykeFormStepType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import { Icons } from "@/components/_v1/icons";
import { Search } from "@/components/(clean-code)/search";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { FileUploader } from "@/components/common/file-uploader";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import { cn, generateRandomString } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { IStepProducts } from "../../../../../../../(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products";
import { ProductImage } from "../../../../../../../(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products/product";
import ComponentDepsModal from "./component-deps-modal";
import { useStepComponentModal } from "./use-step-component-modal";

interface Props {
    item: IStepProducts[number];
    ctx: LegacyDykeFormStepType;
}
export default function StepComponentModal({ item, ctx }: Props) {
    const stepModal = useStepComponentModal(ctx, item);
    const {
        form,
        tab,
        door,
        setTab,
        stepS,
        onUpload,
        species,
        url,
        svg,
        img,
        save,
        ComponentList,
    } = stepModal;

    return (
        <RenderForm {...form}>
            <Modal.Content>
                <Modal.Header
                    title="Edit Product"
                    subtitle={item.product?.title}
                />
                <div>
                    <Tabs value={tab} onValueChange={setTab as any}>
                        <TabsList className="">
                            <TabsTrigger value="general">General</TabsTrigger>
                            {ctx.isDoor && (
                                <TabsTrigger value="price">Price</TabsTrigger>
                            )}
                            <TabsTrigger value="step">
                                Component Step
                            </TabsTrigger>
                            {!item.id ? (
                                <>
                                    <TabsTrigger value="deleted">
                                        Copy
                                    </TabsTrigger>
                                    <TabsTrigger value="restore">
                                        Restore
                                    </TabsTrigger>
                                </>
                            ) : (
                                <></>
                            )}
                        </TabsList>
                        <TabsContent value="general">
                            <div className="grid gap-4">
                                {ctx.isRoot ? (
                                    <FormInput
                                        control={form.control}
                                        size="sm"
                                        name="product.value"
                                        label="Item Type"
                                    />
                                ) : (
                                    <>
                                        <FormInput
                                            size="sm"
                                            control={form.control}
                                            name="product.title"
                                            label="Product Title"
                                        />
                                    </>
                                )}
                                <FormInput
                                    control={form.control}
                                    size="sm"
                                    name="productCode"
                                    label="Product Code"
                                />
                                {ctx.isMoulding && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {species.map((s, i) => (
                                            <FormCheckbox
                                                key={i}
                                                label={s}
                                                control={form.control}
                                                name={`product.meta.mouldingSpecies.${s}`}
                                            />
                                        ))}
                                    </div>
                                )}
                                <FileUploader
                                    width={50}
                                    height={50}
                                    onUpload={onUpload}
                                    label="Product Image"
                                    folder="dyke"
                                >
                                    <ProductImage
                                        item={{
                                            product: {
                                                img,
                                                meta: {
                                                    svg,
                                                    url,
                                                },
                                            },
                                        }}
                                    />
                                </FileUploader>
                            </div>
                        </TabsContent>
                        <TabsContent value="price">
                            <div className="grid grid-cols-2 gap-2">
                                {ctx.isDoor ? (
                                    <div className="col-span-2">
                                        <Tabs
                                            className="w-full "
                                            defaultValue={door.priceTab}
                                        >
                                            <TabsList>
                                                {door.heightList.map((h) => (
                                                    <TabsTrigger
                                                        key={h}
                                                        value={h}
                                                    >
                                                        {h}
                                                    </TabsTrigger>
                                                ))}
                                            </TabsList>
                                            {door.heightList.map((h) => (
                                                <TabsContent key={h} value={h}>
                                                    <div className="grid  grid-cols-4 gap-4">
                                                        {door.heights[h]?.map(
                                                            (size) => (
                                                                <FormInput
                                                                    key={size}
                                                                    size="sm"
                                                                    control={
                                                                        form.control
                                                                    }
                                                                    // prefix="$"
                                                                    name={`product.meta.doorPrice.${size}`}
                                                                    label={size}
                                                                    type="number"
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </TabsContent>
                                            ))}
                                        </Tabs>
                                    </div>
                                ) : (
                                    <FormInput
                                        control={form.control}
                                        name="product.price"
                                        label="Base Price"
                                        type="number"
                                        size="sm"
                                        className="col-span-2"
                                    />
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="step">
                            <div className="flex flex-col gap-2">
                                {stepS.fields.map((f, fieldIndex) => (
                                    <div
                                        className="group relative flex flex-col items-center"
                                        key={f._id}
                                    >
                                        {fieldIndex != 0 && (
                                            <>
                                                <Icons.chevronDown className="size-4" />
                                            </>
                                        )}
                                        <FormSelect
                                            control={form.control}
                                            listMode
                                            type="combo"
                                            name={`meta.stepSequence.${fieldIndex}.id`}
                                            className="w-full"
                                            size="sm"
                                            onSelect={(e) => {
                                                const empties =
                                                    stepS.fields.filter(
                                                        (f, fi) =>
                                                            !f.id &&
                                                            fi != fieldIndex,
                                                    );
                                                const emptyLength =
                                                    empties.length <= 0;
                                                if (emptyLength)
                                                    stepS.append({});
                                            }}
                                            options={door.stepTitles}
                                        />
                                        <div className="absolute right-0  -mr-2 -mt-4 hidden group-hover:block">
                                            <Button
                                                onClick={() => {
                                                    stepS.remove(fieldIndex);
                                                }}
                                                className="h-6 w-6 p-1"
                                                size="sm"
                                                variant="destructive"
                                            >
                                                <Icons.trash className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="w-28"></div>
                        </TabsContent>
                        <TabsContent value="deleted">
                            <ComponentList />
                        </TabsContent>
                        <TabsContent value="restore">
                            <ComponentList isRestore />
                        </TabsContent>
                    </Tabs>
                </div>
                <Modal.Footer submitText="Save" onSubmit={save} />
            </Modal.Content>
        </RenderForm>
    );
}
