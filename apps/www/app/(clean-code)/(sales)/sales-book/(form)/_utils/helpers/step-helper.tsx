import { IStepProducts } from "@/app/(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products";
import { LegacyDykeFormStepType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import { generateRandomString } from "@/lib/utils";
import { _modal } from "@/components/common/modal/provider";
import ComponentDepsModal from "../../_components/modals/step-component-modal/component-deps-modal";
import { toast } from "sonner";
import { saveStepProduct } from "@/app/(v2)/(loggedIn)/sales-v2/form/_action/save-step-product";
import { sortStepComponentsUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";

type CtxProps = LegacyDykeFormStepType;
export type StepProduct = IStepProducts[number];
const stepHelpers = {
    componentDepsForm,
    copyProduct,
    onUpload,
    saveComponent,
    getDykeStepState,
    formStepsForDeps,
    finishSort,
    profileChanged,
};

function profileChanged(ctx: CtxProps) {
    ctx.reloadComponents();
}
async function selectCustomComponent(ctx: CtxProps, value, price) {}
async function finishSort(ctx: CtxProps) {
    //TODO: FINISH SORT
    await sortStepComponentsUseCase(ctx.components);
    ctx.reloadComponents();
}
async function componentDepsForm(ctx: CtxProps, formData: StepProduct) {
    if (!formData.id) formData.uid = generateRandomString(5);

    _modal.openModal(<ComponentDepsModal ctx={ctx} formData={formData} />);
}
async function saveComponent(ctx: CtxProps, formData: StepProduct, form?) {
    if (form) {
        const d = form.getValues("show");
        let _show = {};
        let valid = false;
        Object.entries(d).map(
            ([k, v]) => v && (_show[k] = true) && (valid = true)
        );
        if (!valid) {
            toast.error(
                "Select atleast one component tree and use the visible for all button"
            );
            return;
        }
        formData.meta.show = d;
    } else {
        formData.meta.show = {};
        formData.meta.deleted = {};
    }
    // now save
    const stepSequence = formData.meta.stepSequence.filter((s) => s.id);
    // console.log(stepSequence);
    // return;
    try {
        stepSequence.map((s, i) => {
            if (stepSequence.filter((f) => f.id == s.id).length > 1)
                throw Error("Step cannot be repeated");
        });
    } catch (error) {
        if (error instanceof Error) toast.error(error.message);
        return;
    }
    formData.meta.stepSequence = stepSequence;
    // return;
    const [pri, sec] = ctx.isRoot ? ["value", "title"] : ["title", "value"];

    if (!formData.product[sec]) formData.product[sec] = formData.product[pri];
    // TODO: MOVE ACTION TO USE CASE
    const stepItem = await saveStepProduct(formData);
    if (stepItem.door) stepItem.product = stepItem.door as any;
    await ctx.reloadComponents();
    _modal.close();
    toast.success("Saved");
}

function copyProduct(form, root, product: StepProduct) {
    if (product.product?.img) onUpload(form, product.product?.img);
    else if (product.product?.meta?.url)
        onUpload(form, product.product?.meta?.url, "product.meta.url");
    else if (product.product?.meta?.svg)
        onUpload(form, product.product?.meta?.svg, "product.meta.svg");
    form.setValue(
        root ? "product.value" : "product.title",
        root ? product?.product?.value : product?.product?.title
    );
    if (product.door?.meta?.doorPrice)
        form.setValue("product.meta.doorPrice", product.door?.meta?.doorPrice);
}
function onUpload(
    form,
    assetId,
    path:
        | "product.img"
        | "product.meta.svg"
        | "product.meta.url" = "product.img"
) {
    let paths: (typeof path)[] = [
        "product.img",
        "product.meta.svg",
        "product.meta.url",
    ];
    paths.map((p) => {
        if (p == path) form.setValue(path, assetId);
        else form.setValue(p, null);
    });
}
function formStepsForDeps(ctx: LegacyDykeFormStepType) {
    const deps = ctx.itemCtx
        .formSteps()
        .filter((fs, i) => i < ctx.stepIndex)
        .map((s) => ({
            uid: s.step.uid,
            label: s.step.title,
            value: s.item.value,
            prodUid: s.item.prodUid,
        }));
    return deps;
}
function getDykeStepState(ctx: LegacyDykeFormStepType) {
    const _formSteps = formStepsForDeps(ctx);
    const stateDeps = ctx.step.step?.meta?.stateDeps;
    let states: {
        step: (typeof _formSteps)[number];
        steps: typeof _formSteps;
        key: string;
    }[] = [];
    let stateBuilder = null;
    _formSteps.map((step, i) => {
        if (stateDeps?.[step.uid]) {
            stateBuilder = [stateBuilder, step.prodUid]
                .filter(Boolean)
                .join("-");
            states.push({
                step,
                steps: stateBuilder
                    ?.split("-")
                    .map((k) => _formSteps.find((fs) => fs.prodUid == k)),
                key: stateBuilder,
            });
            if (i > 0) {
                let sb2 = step.prodUid;
                states.push({
                    step,
                    steps: sb2
                        ?.split("-")
                        .map((k) => _formSteps.find((fs) => fs.prodUid == k)),
                    key: sb2,
                });
            }
        }
    });
    return states;
}
export default stepHelpers;

// export const profileUpdateStepCtx = {
//     steps: {},
//     registerStep(ctx: LegacyDykeFormStepType) {
//         // console.log("REGISTER");
//         profileUpdateStepCtx.steps[`item-${ctx.itemCtx.rowIndex}`] =
//             ctx.reloadComponents;
//     },
//     applyUpdates() {
//         // console.log("APPLY>>>>", Object.keys(profileUpdateStepCtx.steps));
//         Object.entries(profileUpdateStepCtx.steps).map(([k, v]) => {
//             // console.log(k);
//             (v as any)?.();
//         });
//     },
// };
