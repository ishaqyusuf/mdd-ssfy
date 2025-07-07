import { DykeStep } from "@/app/(v2)/(loggedIn)/sales-v2/type";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useTransition,
} from "react";
import { useLegacyDykeForm, useLegacyDykeFormItem } from "../../legacy-hooks";
import { useDykeComponentStore } from "../../data-store";
import { IStepProducts } from "@/app/(v2)/(loggedIn)/sales-v2/form/components/step-items-list/item-section/step-products";
import legacyDykeFormHelper from "../../../_utils/helpers/legacy-dyke-form-helper";
import stepHelpers from "../../../_utils/helpers/step-helper";
import { toast } from "sonner";
export type LegacyDykeFormStepType = ReturnType<
    typeof useLegacyDykeFormStepContext
>;
export const LegacyDykeFormStepContext =
    createContext<LegacyDykeFormStepType>(null);
export type LegacyDoorHPTType = ReturnType<typeof useLegacyDoorHPTContext>;
export const useLegacyDykeFormStep = () =>
    useContext(LegacyDykeFormStepContext);

export const LegacyDoorHPTContext = createContext<LegacyDoorHPTType>(null);
export const useLegacyDoorHPT = () => useContext(LegacyDoorHPTContext);
export function useLegacyDykeFormStepContext(stepIndex, _step: DykeStep) {
    const [step, setStep] = useState(_step);
    const ctx = useLegacyDykeForm();
    const itemCtx = useLegacyDykeFormItem();
    const priceRefresher = ctx.form.watch(
        `itemArray.${itemCtx.rowIndex}.priceRefresher`
    );
    const dependencies = itemCtx
        .formSteps()
        .map((s) => ({
            uid: s.step.uid,
            label: s.step.title,
            value: s.item.value,
            prodUid: s.item.prodUid,
        }))
        .filter(
            (_, i) =>
                i < stepIndex && _step?.step?.meta?.priceDepencies?.[_.uid]
        );
    const uids = dependencies.map((s) => s.prodUid);
    const dependenciesUid = uids.length ? uids.join("-") : null;
    useEffect(() => {
        stepCtx.reloadComponents();
    }, [priceRefresher]);
    const componentsByTitle = useDykeComponentStore(
        (state) => state.loadedComponentsByStepTitle
    );
    const [sortMode, setSortMode] = useState(false);
    const updateComponent = useDykeComponentStore(
        (state) => state.updateComponent
    );
    type Product = IStepProducts[number] & {
        _selected?: boolean;
    };
    const [filteredComponents, setFilteredComponents] = useState<Product[]>([]);

    const [components, setComponents] = useState<Product[]>([]);
    const [deletedComponents, setDeletedComponents] = useState<Product[]>([]);
    // const [_components,_setComponents] = use
    const [loading, startLoading] = useTransition();

    async function fetchStepComponents() {
        startLoading(async () => {
            const { cache, data, key } =
                await legacyDykeFormHelper.step.loadComponents(
                    componentsByTitle,
                    stepCtx
                );
        });
    }
    async function reloadComponents() {
        startLoading(async () => {
            const { cache, data, key } =
                await legacyDykeFormHelper.step.loadComponents(
                    componentsByTitle,
                    stepCtx,
                    true
                );
        });
    }
    useEffect(() => {
        fetchStepComponents();
    }, []);
    const formStepRootPath = itemCtx.getPath.item(
        `item.formStepArray.${stepIndex}`
    ) as any;
    async function updateStep(stepForm) {
        setStep(stepForm);

        ctx.form.setValue(formStepRootPath, stepForm);
        reloadComponents();
    }

    const [stepValue, allowAdd, allowCustom, enableSearch] = ctx.form.watch([
        `${formStepRootPath}.step.value`,
        `${formStepRootPath}.step.meta.allowAdd`,
        `${formStepRootPath}.step.meta.allowCustom`,
        `${formStepRootPath}.step.meta.enableSearch`,
    ] as any);

    const watch = {
        stepValue,
        sortMode,
        allowAdd,
        allowCustom,
        enableSearch,
    };
    const [selections, setSelections] = useState({});
    const [hasSelection, setHasSelection] = useState(false);
    const [selectCount, setSelectCount] = useState(0);
    useEffect(() => {
        const sel = Object.values(selections)
            ?.map((a) => (a as any).selected)
            ?.filter(Boolean)?.length;
        setSelectCount(sel);
        setHasSelection(sel > 0);
    }, [selections]);
    const stepCtx = {
        dependenciesUid,
        dependencies,
        deletedComponents,
        sortToggle() {
            if (sortMode) {
                stepHelpers.finishSort(stepCtx);
                toast.success("Saved");
            }
            setSortMode(!sortMode);
        },
        updateStep,
        reloadComponents,
        setDeletedComponents,
        fetchStepComponents,
        updateComponent,
        filteredComponents,
        setFilteredComponents,
        loading,
        mainCtx: ctx,
        itemCtx,
        // itemArray: ctx.itemArray,
        rowIndex: itemCtx.rowIndex,
        step,
        // components,
        components: filteredComponents,
        setComponents,
        stepIndex,
        isRoot: step.step.title == "Item Type",
        isDoor: step.step.title == "Door",
        isMoulding: step.step.title == "Moulding",
        watch,
        selections,
        hasSelection,
        selectCount,
        cancelSelection() {
            setSelectCount(0);
            setSelections({});
            setHasSelection(false);
        },
        toggleSelection(item, index) {
            setSelections((e) => {
                const s = { ...e };
                s[item.uid] = {
                    item,
                    selected: !s[item.uid]?.selected,
                };
                return s;
            });
        },
    };
    return stepCtx;
}
export function useLegacyDoorHPTContext(title) {
    const itemCtx = useLegacyDykeFormItem();
    const formSteps = itemCtx.formSteps();
    const doorStepIndex = formSteps.findIndex((i) => i.step.title == "Door");
    if (!doorStepIndex) throw new Error("Door Not found");
    const doorStepCtx = useLegacyDykeFormStepContext(
        doorStepIndex,
        formSteps[doorStepIndex] as any
    );

    const [showSelection, setShowSelection] = useState(false);
    async function changeDoor() {}
    return {
        doorStepCtx,
    };
    // const rootPath =
    // const k: FieldPath<OldDykeFormData> = "_rawData.billingAddress.city";
}
