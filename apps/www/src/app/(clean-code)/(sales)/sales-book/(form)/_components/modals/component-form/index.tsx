import { createContext, useContext } from "react";
import { createComponentUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { StepComponentForm } from "@/app/(clean-code)/(sales)/types";
import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import { FileUploader } from "@/components/common/file-uploader";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { Image } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";

import { StepHelperClass } from "../../../_utils/helpers/zus/step-component-class";
import { ComponentImg } from "../../component-img";
import { openImgModal } from "../img-gallery-modal";

interface Props {
    stepCls: StepHelperClass;
    data: StepComponentForm;
}

const Context = createContext<ReturnType<typeof useInitContext>>(null);
const useCtx = () => useContext(Context);
export function openComponentModal(
    stepCls: StepHelperClass,
    data?: Props["data"],
) {
    if (!data) {
        data = {
            title: "",
            stepId: stepCls.getStepForm().stepId,
            isDoor: stepCls.isDoor(),
            productCode: "",
        };
    }
    _modal.openModal(<StepComponentFormModal stepCls={stepCls} data={data} />);
}
export function useInitContext(props: Props) {
    const form = useForm({
        defaultValues: {
            ...props.data,
        },
    });
    const cls = props.stepCls;
    async function save() {
        const data = form.getValues();
        const resp = await createComponentUseCase(data);
        cls.addStepComponent(resp);
        _modal.close();
        toast.success("Saved.");
    }
    const [img, title] = form.watch(["img", "title"]);
    const browseImg = () => {
        openImgModal({
            title: title,
            stepId: props.stepCls.getStepForm().stepId,
            onBack() {
                openComponentModal(props.stepCls, {
                    ...form.getValues(),
                });
            },
            onSelect(img) {
                openComponentModal(props.stepCls, {
                    ...form.getValues(),
                    img,
                });
            },
        });
    };
    const onImgUpload = (assetId) => {
        form.setValue("img", assetId);
    };
    return {
        form,
        browseImg,
        onImgUpload,
        save,
        img,
        title,
    };
}
export default function StepComponentFormModal(props: Props) {
    const ctx = useInitContext(props);

    return (
        <Context.Provider value={ctx}>
            <Modal.Content>
                <Modal.Header title={"Step Component"} subtitle={""} />
                <Form {...ctx.form}>
                    <FormInput
                        uppercase
                        control={ctx.form.control}
                        name="title"
                        label="Component Name"
                    />
                    <FormInput
                        uppercase
                        control={ctx.form.control}
                        name="productCode"
                        label="Product Code"
                    />
                    <div className="flex items-center justify-between">
                        <Label>Image</Label>
                        <Button onClick={ctx.browseImg} size="xs">
                            <Image className="mr-2 size-4" />
                            Images
                        </Button>
                    </div>
                    <div className="flex justify-center">
                        <FileUploader
                            width={50}
                            height={50}
                            src={ctx.img}
                            onUpload={ctx.onImgUpload}
                            label="Product Image"
                            folder="dyke"
                        >
                            <div className="w-2/3">
                                <ComponentImg
                                    src={ctx.img}
                                    aspectRatio={2 / 2}
                                />
                                {/* <ProductImage
                                    item={{
                                        product: {
                                            img,
                                            meta: {
                                                svg,
                                                url,
                                            },
                                        },
                                    }}
                                /> */}
                            </div>
                        </FileUploader>
                        {/* <ComponentImg src={ctx.img} aspectRatio={2 / 2} /> */}
                    </div>
                </Form>
                <Modal.Footer submitText="Save" onSubmit={ctx.save} />
            </Modal.Content>
        </Context.Provider>
    );
}
