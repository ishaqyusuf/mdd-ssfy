import { dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { getPricingByUidUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-pricing-use-case";
import {
    getStepComponentsUseCase,
    saveComponentRedirectUidUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { _modal } from "@/components/common/modal/provider";
import { generateRandomString, sum } from "@/lib/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { toast } from "sonner";

import {
    ZusComponent,
    ZusItemFormData,
    ZusSales,
    ZusStepFormData,
} from "../../../_common/_stores/form-data-store";
import { SettingsClass } from "./settings-class";
import { zhHarvestDoorSizes } from "./zus-form-helper";

interface Filters {
    stepUid?;
    stepTitle?;
}
export class StepHelperClass extends SettingsClass {
    stepUid: string;
    itemUid;
    constructor(
        public itemStepUid,
        public staticZus?: ZusSales,
    ) {
        const [itemUid, stepUid] = itemStepUid?.split("-");
        super(itemStepUid, itemUid, stepUid, staticZus);
        this.itemUid = itemUid;
        this.stepUid = stepUid;
    }

    public isShelfItems() {
        return this.getStepForm()!.title == "Shelf Items";
    }
    public isHtp() {
        return this.getStepForm()!.title == "House Package Tool";
    }
    public isDoor() {
        return this.getStepForm().title == "Door";
    }
    public getDoorStepForm2() {
        const doorStepForm = Object.entries(this.zus.kvStepForm).find(
            ([k, v]) => k.startsWith(`${this.itemUid}-`) && v.title === "Door",
        );
        return {
            itemStepUid: doorStepForm?.[0],
            form: doorStepForm?.[1],
        };
    }
    public setDoorSupplier(
        doorItemStepUid?,
        supplier?: {
            uid: string;
            name: string;
        },
    ) {
        if (!doorItemStepUid)
            doorItemStepUid = this.getDoorStepForm2()?.itemStepUid;

        if (doorItemStepUid) {
            this.zus.dotUpdate(
                `kvStepForm.${doorItemStepUid}.formStepMeta.supplierUid`,
                supplier?.uid || null,
            );
            this.zus.dotUpdate(
                `kvStepForm.${doorItemStepUid}.formStepMeta.supplierName`,
                supplier?.name || null,
            );
        }
    }
    public isLineItem() {
        return this.getStepForm().title == "Line Item";
    }
    public isMoulding() {
        return this.getStepForm().title == "Moulding";
    }
    public isServiceLineItem() {
        return (
            this.getItemForm().groupItem?.type != "MOULDING" &&
            this.isLineItem()
        );
    }
    public isMouldingLineItem() {
        return (
            this.getItemForm().groupItem?.type == "MOULDING" &&
            this.isLineItem()
        );
    }
    public isMultiSelect() {
        return this.isDoor() || this.isMoulding();
    }
    public getTotalSelectionsCount() {
        return this.getItemForm()?.groupItem?.itemIds?.length;
    }
    public getTotalSelectionsQty() {
        return this.getItemForm()?.groupItem?.qty?.total;
    }
    public hasSelections() {
        return this.getTotalSelectionsQty() && this.isMultiSelect();
    }
    public getStepIndex() {
        const index = this.getItemStepSequence()?.indexOf(this.itemStepUid);
        return index;
    }
    public getItemStepSequence() {
        const sequence = this.zus.sequence.stepComponent?.[this.itemUid];
        return sequence;
    }
    public getCurrentStepSequence() {
        const sequence = this.getItemStepSequence();
        const index = this.getStepIndex();
        return sequence.filter((a, i) => i <= index);
    }
    public getItemStepForms() {
        const sequence = this.getItemStepSequence();
        return Object.entries(this.zus.kvStepForm)
            .filter(([k, data]) => sequence.includes(k))
            .map(([k, data]) => data);
    }
    public getStepSequence() {
        return this.getItemStepSequence()
            ?.map((s) => s.split("-")?.[1])
            .filter(Boolean);
    }
    public getItemForm() {
        return this.zus.kvFormItem[this.itemUid];
    }
    public getStepForm() {
        return this.zus.kvStepForm[this.itemStepUid];
    }
    public updateStepForm(data: ZusStepFormData) {
        Object.entries(data).map(([k, v]) => {
            this.zus.dotUpdate(`kvStepForm.${this.itemStepUid}.${k}` as any, v);
        });
    }
    public getSupplierInfo() {
        // const s = Object.entries(this.zus.kvStepForm).find(
        //     ([itemStepUid, stepData]) =>
        //         itemStepUid?.startsWith(`${this.itemUid}-`) &&
        //         stepData?.title == "Supplier",
        // );
    }
    public findStepForm(stepUid) {
        return this.zus.kvStepForm[`${this.itemUid}-${this.stepUid}`];
    }
    public getStepPriceDeps() {
        const stepForm = this.getStepForm();
        return stepForm?.meta?.priceStepDeps || [];
    }
    public stepValueUids(stepUids: string[]) {
        // const uidStacks = [];
        return stepUids
            .map((uid) => {
                return this.zus.kvStepForm[`${this.itemUid}-${uid}`]
                    ?.componentUid;
            })
            .filter(Boolean)
            .join("-");
    }
    public getComponentPricings(componentUid) {
        // if(!component)componentUid = this.
        const pricings = this.zus.pricing[componentUid];
        return pricings;
    }
    public getVisibleComponents() {
        // const ls = this.getStepComponents;
        // if (ls) return this.filterStepComponents(ls);
        const sets = this.zus.setting?.stepsByKey?.[this.stepUid]?.components;
        if (sets?.length) {
            return this.filterStepComponents(sets as any);
        }
        return [];
    }
    public getComponentPrice(componentUid) {
        const priceDeps = this.getStepPriceDeps();
        const componentPricings = this.getComponentPricings(componentUid);
        const stepUids = this.stepValueUids(priceDeps);

        if (!priceDeps.length) {
            return componentPricings?.[componentUid]?.price || null;
        }
        return componentPricings?.[stepUids]?.price || null;
    }
    public isComponentVisible(c: ZusComponent) {
        let vis = [];
        if (c.variations?.length) {
            c.variations.some((v) => {
                const rules = v.rules;
                const matches = rules.every(
                    ({ componentsUid, operator, stepUid: __stepUid }) => {
                        const selectedComponentUid =
                            this.zus.kvStepForm[`${this.itemUid}-${__stepUid}`]
                                ?.componentUid;
                        return (
                            !componentsUid?.length ||
                            (operator == "is"
                                ? componentsUid?.some(
                                      (a) => a == selectedComponentUid,
                                  )
                                : componentsUid?.every(
                                      (a) => a != selectedComponentUid,
                                  ))
                        );
                    },
                );
                if (matches)
                    vis.push(...rules.map((r) => r.componentsUid.join("-")));
                return matches;
            });
            if (!vis.length) return null;
            return vis;
        }
        return ["default"];
    }
    public get getStepComponents() {
        return this.zus.kvStepComponentList?.[this.stepUid];
    }
    public get getStepFilteredComponents() {
        // return this.zus.kvFilteredStepComponentList?.[this.itemStepUid];
        return this.zus.kvStepComponentList[this.stepUid];
    }
    public updateStepComponent(data) {
        this.zus.dotUpdate(
            `kvStepComponentList.${this.stepUid}`,
            this.getStepComponents?.map((c) => {
                if (c.uid == data.uid) return data;
                return c;
            }),
        );
        this.refreshStepComponentsData();
    }
    public updateComponentKey(key: FieldPath<ZusComponent>, value, ...uids) {
        this.zus.dotUpdate(
            `kvStepComponentList.${this.stepUid}`,
            this.getStepComponents?.map((c) => {
                if (uids.includes(c.uid)) {
                    const s = dotSet(c);
                    s.set(key as any, value);
                }

                return c;
            }),
        );
    }
    public updateStepComponentVariants(variations, componentUids: string[]) {
        this.zus.dotUpdate(
            `kvStepComponentList.${this.stepUid}`,
            this.getStepComponents?.map((c) => {
                if (componentUids.includes(c.uid)) c.variations = variations;

                return c;
            }),
        );
    }
    public getComponentVariantData() {
        const sequence = this.getItemStepSequence();
        const index = sequence?.indexOf(this.itemStepUid);
        const data: {
            steps: { uid: string; title: string }[];
            componentsByStepUid: {
                [stepUid in string]: {
                    uid: string;
                    title: string;
                }[];
            };
            stepsCount: number;
        } = {
            steps: [],
            componentsByStepUid: {},
            stepsCount: 0,
        };
        sequence
            .filter((s, i) => i < index)
            .map((s) => {
                const [_, currentStepUid] = s.split("-");
                const stepData = this.zus.setting.stepsByKey?.[currentStepUid];

                if (stepData) {
                    data.stepsCount++;
                    data.steps.push({
                        uid: currentStepUid,
                        title: stepData.title,
                    });
                    data.componentsByStepUid[currentStepUid] =
                        stepData.components || [];
                }
            });
        return data;
    }
    public async refreshStepComponentsData(reload = false) {
        await this.fetchStepComponents(reload);
    }
    public addStepComponent(component) {
        let _components = this.getStepComponents;
        let index = _components.findIndex((s) => s.id == component.id);
        if (index >= 0) _components[index] = component;
        else _components.push(component);
        this.zus.dotUpdate(`kvStepComponentList.${this.stepUid}`, [
            ..._components,
        ]);
        this.refreshStepComponentsData();
    }
    public deleteComponent(id) {
        this.zus.dotUpdate(`kvStepComponentList.${this.stepUid}`, [
            ...this.getStepComponents.filter((s) => s.id != id),
        ]);
        this.refreshStepComponentsData();
    }
    public async fetchStepComponents(reload = false) {
        const stepData = this.getStepForm();
        const ls = this.getStepComponents;

        const components =
            ls?.length && !reload
                ? ls
                : stepData
                  ? await getStepComponentsUseCase(
                        stepData.title,
                        stepData.stepId,
                    )
                  : [];
        if (!ls?.length || reload)
            this.zus.dotUpdate(
                `kvStepComponentList.${this.stepUid}`,
                components,
            );
        return this.filterStepComponents(components);
    }

    public getAllVisibleComponents(filter?: Filters) {
        const itemStepsUids = this.getItemStepSequence();
        return itemStepsUids

            .map((itemStepUid) => {
                const [itemUid, stepUid] = itemStepUid.split("-");
                // const rootStep = this.rootStepFromUid(stepUid);
                const itemStepCls = new StepHelperClass(itemStepUid);
                const components = itemStepCls.getVisibleComponents();
                const stepForm = itemStepCls.getStepForm();
                return {
                    stepTitle: stepForm.title,
                    stepUid: itemStepCls.stepUid,
                    components,
                };
            })
            .filter((a) => {
                if (filter?.stepTitle) return a.stepTitle == filter.stepTitle;
                if (filter?.stepUid) return a.stepUid == filter.stepUid;
                return true;
            })
            .map((a) => a.components)
            .flat()
            ?.filter((a) => a._metaData?.visible);
    }
    public selectionUid;
    public filterStepComponents(components: ZusComponent[]) {
        let filteredComponents = components
            // ?.filter(cls.isComponentVisible)
            ?.map((component, index) => {
                if (!component._metaData) component._metaData = {} as any;
                const vis = this.isComponentVisible(component);
                component._metaData.visible = !!vis;
                component.basePrice = this.getComponentPrice(component.uid);
                component.salesPrice = component._metaData.custom
                    ? component.basePrice
                    : this.calculateSales(component.basePrice);
                // component.salesPrice = component._metaData.custom
                //     ? component.basePrice
                //     : this.calculateSales(component.basePrice);
                // const sort = component._metaData.sorts?.find((s) =>
                //     vis?.includes(s.uid),
                // );
                // let sortIndex = sort?.sortIndex;
                // // component._metaData.sortId = this.getCurrentStepSequence();
                // component._metaData.sortIndex = sortIndex;
                // component._metaData.sortUid = sort?.uid || vis?.[0];
                return component;
            });
        // if (
        //     filteredComponents?.filter((a) => a._metaData.sortIndex)?.length > 0
        // ) {
        //     filteredComponents = filteredComponents.sort(
        //         (a, b) => a._metaData.sortIndex - b._metaData.sortIndex,
        //     );
        // }
        // this.zus.dotUpdate(
        //     `kvFilteredStepComponentList.${this.itemStepUid}`,
        //     filteredComponents,
        // );
        return filteredComponents;
    }
    public rootStepFromUid(stepUid) {
        const mainStep = Object.values(
            this.zus.setting.rootComponentsByKey,
        )?.find((s) => s.stepUid == stepUid);
        return mainStep;
    }
    public selectorState: {
        state: {
            uids: {};
            count: number;
        };
        setState: any;
    } = {
        state: null,
        setState: null,
    };
    public resetSelector(state, setState) {
        // this.selection = { count: 0, selection: {} };
        this.selectorState = {
            state,
            setState,
        };
        setState({
            uids: {},
            count: 0,
        });
        return this;
    }
    public toggleComponent(componentUid) {
        this.selectorState.setState?.((current) => {
            const state = !current.uids?.[componentUid];
            const count = current.count + state ? 1 : -1;
            const resp = {
                uids: {
                    ...current?.uids,
                    [componentUid]: state,
                },
                count,
            };

            return resp;
        });
    }
    public saveStepForm(data: ZusStepFormData) {
        this.zus.dotUpdate(`kvStepForm.${this.itemStepUid}`, data);
    }
    public saveItemForm(data: ZusItemFormData) {
        this.zus.dotUpdate(`kvFormItem.${this.itemUid}`, data);
    }
    public dotUpdateItemForm<K extends FieldPath<ZusItemFormData>>(
        k: K,
        value: FieldPathValue<ZusItemFormData, K>,
    ) {
        this.zus.dotUpdate(`kvFormItem.${this.itemUid}.${k}`, value as any);
    }
    public updateStepFormMeta(meta) {
        const step = this.getStepForm();
        const d = dotSet(step);
        d.set("meta", meta);
        this.saveStepForm(step);
    }
    public deleteStepsForm(itemStepsUid: string[]) {
        if (itemStepsUid?.length) {
            const newData = {};
            Object.entries(this.zus.kvStepForm)
                .filter(([a, b]) => !itemStepsUid?.includes(a))
                .map(([a, b]) => (newData[a] = b));
            this.zus.dotUpdate(`kvStepForm`, newData);
        }
    }
    public updateNextStepSequence(nextStepUid, stepForm) {
        const stepSq = this.getItemStepSequence();
        const prevStepIndex = stepSq.indexOf(this.itemStepUid);
        const prevNextStepUid = stepSq[prevStepIndex + 1];
        if (prevNextStepUid) {
            if (prevNextStepUid != nextStepUid) {
                const rems = stepSq.splice(
                    prevStepIndex + 1,
                    stepSq.length - prevStepIndex - 1,
                );
                this.deleteStepsForm(rems);
                stepSq.push(nextStepUid);
            }
        } else {
            stepSq.push(nextStepUid);
        }
        this.zus.dotUpdate(`kvStepForm.${nextStepUid}`, stepForm);
        this.zus.dotUpdate(`sequence.stepComponent.${this.itemUid}`, stepSq);
        this.toggleStep(nextStepUid);
    }
    public nextStep(isRoot = false, redirectUid = null) {
        const nrs = this.getNextRouteFromSettings(
            this.getItemForm(),
            isRoot,
            redirectUid,
        );

        if (!nrs.nextRoute) {
            toast.error("This Form Step Sequence has no next step.");
            return;
        }
        let { nextStepForm, nextRoute, nextStepUid } = nrs;
        if (!nextStepForm) {
            nextStepForm = {
                componentUid: null,
                meta: nextRoute.meta,
                flatRate: false,
            };
        }
        nextStepForm.title = nextRoute.title;
        nextStepForm.stepId = nextRoute.id;
        nextStepForm.value = nextStepForm.value || "";

        this.updateNextStepSequence(nextStepUid, nextStepForm);
    }
    public getDoorPriceModel(componentUid) {
        const { sizeList, height } = zhHarvestDoorSizes(this.zus, this.itemUid);
        const formData = {
            priceVariants: {} as {
                [size in string]: {
                    id?: number;
                    price?: number;
                };
            },
            stepProductUid: componentUid,
            dykeStepId: this.getStepForm().stepId,
        };

        const stepProdPricings = this.getComponentPricings(componentUid);
        sizeList.map((sl) => {
            // sl.size eg; 2-0 x 7-0.
            // new 2-0 x 7-0 & supplierUID
            const supllierSizeDep = this.supplierSizeDep(sl.size);

            formData.priceVariants[sl.size] = stepProdPricings?.[
                supllierSizeDep
                // sl.size
            ] || {
                id: null,
                price: "",
            };
        });
        let filt = sizeList?.filter((s) => s.height == height);

        return {
            formData,
            sizeList,
            height,
            heightSizeList: filt?.filter(
                (a, i) => i == filt.findIndex((s) => s.size == a.size),
            ),
        };
    }
    public supplierSizeDep = (size) => {
        const supplierUid =
            this.getDoorStepForm2()?.form?.formStepMeta?.supplierUid;
        if (!supplierUid) return size;
        return [size, supplierUid].join(" & ");
    };
    public getCurrentComponentPricingModel(componentUid) {
        const pm = this.getComponentPriceModel(componentUid);
        const variant = pm.priceVariants.find((s) => s.current);
        const pricing = pm?.pricing?.[variant?.path];
        return {
            variant,
            pricing,
        };
    }
    public getPricedSteps() {
        // const itemForm = this.getItemForm();
        const itemSteps = this.getItemStepForms();
        return itemSteps
            .map((step) => {
                return {
                    title: step.title,
                    price: step.salesPrice,
                    value: step.value,
                };
            })
            .filter((p) => p.price);
    }
    public getComponentPriceModel(componentUid) {
        const priceDeps = this.getStepPriceDeps();
        const stepSeqs = this.getItemStepSequence();

        const matchedSteps = priceDeps
            ?.map((dep) => {
                const [itemUid, stepUid] =
                    stepSeqs?.find((s) => s.endsWith(`-${dep}`))?.split("-") ||
                    [];
                return stepUid;
            })
            .filter(Boolean);
        // const componentUid = this.componentUid;
        const componentPricings = this.getComponentPricings(componentUid);
        const form = {
            pricing: componentPricings,
            priceVariants: [] as {
                path: string;
                title: string[];
                current?: boolean;
            }[],
        };

        if (!matchedSteps?.length) {
            form.priceVariants.push({
                // path: `${componentUid}.${componentUid}`,
                path: componentUid,
                title: ["Default Price"],
                current: true,
            });
        } else {
            const ms = matchedSteps.map((stepUid) => {
                const components =
                    this.zus.setting?.stepsByKey?.[stepUid]?.components;
                return components
                    .filter((c) => {
                        const mainStep = this.rootStepFromUid(stepUid);
                        if (mainStep) {
                            const stepSeq = this.getItemStepSequence()?.[0];
                            const rootCUid =
                                this.zus.kvStepForm[stepSeq]?.componentUid;
                            return c.uid == rootCUid;
                        }
                        return true;
                    })
                    .map((c) => ({
                        ...c,
                        stepUid,
                    }))
                    .filter(Boolean);
            });
            const combs = getCombinations(ms);

            const visibleComponents = this.getAllVisibleComponents();
            const visibleComponentsUID = visibleComponents.map((a) => a.uid);
            const filteredCombs = combs.filter((a) => {
                return a.uidStack.every((u) =>
                    visibleComponentsUID.includes(u),
                );
            });
            const kvstepforms = this.zus.kvStepForm;
            form.priceVariants = filteredCombs?.map((fc) => {
                const path = fc.uidStack?.join("-");
                let current = fc.uidStack.every(
                    (u, i) =>
                        kvstepforms[`${this.itemUid}-${fc.stepUidStack[i]}`]
                            ?.componentUid == u,
                );
                if (!form.pricing) form.pricing = {};
                if (!form.pricing[path])
                    form.pricing[path] = {
                        price: "",
                        id: null,
                    };
                return {
                    path,
                    title: fc.titleStack,
                    current,
                };
            });
        }
        return form;
    }
    public toggleStep(itemStepUid = this.itemStepUid) {
        let currentStepUid = this.getItemForm()?.currentStepUid;
        if (currentStepUid == itemStepUid) currentStepUid = null;
        else currentStepUid = itemStepUid;
        this.dotUpdateItemForm("currentStepUid", currentStepUid);
    }

    public resetGroupItem(itemType) {
        const itemForm = this.getItemForm();
        let _itemType = itemForm.groupItem?.itemType;
        if (_itemType != itemType) {
            _itemType = itemType;
            if (_itemType == "Shelf Items") {
                if (!itemForm.shelfItems)
                    itemForm.shelfItems = {
                        lineUids: [],
                        lines: {},
                        subTotal: 0,
                        salesItemId: null,
                    };
                itemForm.groupItem = {
                    itemType: _itemType,
                } as any;
                return;
            }
            const basePrice = "" as any;
            const salesPrice = "" as any;
            const type =
                _itemType == "Moulding"
                    ? "MOULDING"
                    : _itemType == "Services"
                      ? "SERVICE"
                      : (_itemType as any) == "Shelf Items"
                        ? "SHELF"
                        : "HPT";
            itemForm.groupItem = {
                pricing: {
                    components: {
                        basePrice,
                        salesPrice,
                    },
                    total: { basePrice, salesPrice },
                },
                itemIds: [],
                itemType,
                type,
                form: {},
                qty: {
                    lh: 0,
                    rh: 0,
                    total: 0,
                },
            };
        }
        this.saveItemForm(itemForm);
        // if(_itemType=='Shelf Items')
    }
}
export class ComponentHelperClass extends StepHelperClass {
    constructor(
        itemStepUid,
        // zus: ZusSales,
        public componentUid,
        public component?: ZusComponent,
    ) {
        super(itemStepUid);
        this.redirectUid = this.getComponent?.redirectUid;
    }
    public redirectUid;

    public get getComponent() {
        if (this.component) return this.component;
        return this.zus.kvStepComponentList[this.stepUid]?.find(
            (c) => c.uid == this.componentUid,
        );
        // this.component = load component
        // return this.component;
    }

    public async fetchUpdatedPrice() {
        const priceData = await getPricingByUidUseCase(this.componentUid);

        Object.entries(priceData).map(([k, d]) =>
            this.zus.dotUpdate(`pricing.${k}`, d),
        );
        this.refreshStepComponentsData();
    }
    public selectComponent(takeOff = false) {
        let component = this.getComponent;
        if (this.isMoulding()) {
            let groupItem = this.getItemForm()?.groupItem;
            groupItem.type = "MOULDING";
            groupItem.stepUid = component.uid;

            if (!groupItem.form?.[this.componentUid]) {
                groupItem.form[this.componentUid] = {
                    stepProductId: {
                        id: this.component.id,
                    },
                    mouldingProductId: component.productId,
                    selected: true,
                    meta: {
                        description: component?.title,
                        taxxable: false,
                        produceable: false,
                        // noHandle: this.getRouteConfig()?.noHandle,
                    },
                    qty: {
                        rh: "",
                        lh: "",
                        total: 1,
                    },
                    // addon: "",
                    pricing: {
                        addon: "",
                        customPrice: "",
                        unitPrice: sum([
                            groupItem?.pricing?.components?.salesPrice,
                            component.salesPrice,
                        ]),
                        itemPrice: {
                            salesPrice: component.salesPrice,
                            basePrice: component.basePrice,
                        },
                    },
                    swing: "",
                };
            } else {
                const selected = (groupItem.form[this.componentUid].selected =
                    !groupItem.form?.[this.componentUid].selected);
            }

            groupItem.itemIds = Object.entries(groupItem.form)
                .filter(([uid, data]) => data.selected)
                .map(([uid, data]) => uid);
            groupItem.qty.total = groupItem.itemIds?.length;

            this.dotUpdateItemForm("groupItem", groupItem);
            this.delistGroupForm();

            this.updateGroupedCost();
            this.calculateTotalPrice();
        } else {
            let stepData = this.getStepForm();
            // stepData.salesOrderItemId;
            if (stepData.title == "Item Type") {
                if (component.title == "Moulding") {
                    this.dotUpdateItemForm("groupItem.type", "SERVICE");
                } else if (component.title == "Shelf Items") {
                    const shelfItems = this.getItemForm()?.shelfItems;
                    if (!shelfItems) {
                        const uid = generateRandomString();
                        const puid = generateRandomString();
                        this.dotUpdateItemForm(`shelfItems`, {
                            subTotal: 0,
                            salesItemId: null,
                            lines: {
                                [uid]: {
                                    categoryIds: [],
                                    productUids: [uid],
                                    products: {
                                        [puid]: {} as any,
                                    },
                                },
                            },
                            lineUids: [uid],
                        });
                    }
                } else if (component.title == "Service") {
                    //
                }
            }
            stepData = {
                ...stepData,
                flatRate: component._metaData?.custom,
                componentUid: this.componentUid,
                componentId: component.id,
                value: component.title,
                stepId: component.stepId,
                salesPrice: component.salesPrice,
                basePrice: component.basePrice,
                sectionOverride: component.sectionOverride,
            };
            if (stepData.title == "Item Type") {
                this.resetGroupItem(component.title);
            }
            this.saveStepForm(stepData);
            this.dotUpdateItemForm("currentStepUid", null);
            const isRoot = this.componentIsRoot();
            // if (isRoot) {
            //     this.dotUpdateItemForm("routeUid", this.componentUid);
            // }
            if (!takeOff) this.nextStep(isRoot, this.redirectUid);
            this.updateComponentCost();
        }
    }
    public componentIsRoot() {
        const route = this.zus.setting.composedRouter;
        const isRoot = route[this.componentUid] != null;
        return isRoot;
    }
    public getMultiSelectData() {
        return Object.entries(this.getItemForm()?.groupItem?.form || {})
            ?.filter(([uid, data]) => uid?.startsWith(`${this.componentUid}`))
            .map(([uid, data]) => data);
    }
    public multiSelected() {
        return this.getMultiSelectData()?.some((s) => s.selected);
    }
    public async saveComponentRedirect(redirectUid) {
        await saveComponentRedirectUidUseCase(this.component.id, redirectUid);
        toast.success("Saved");
        this.updateStepComponent({
            ...this.component,
            redirectUid,
        });
    }
    public delistGroupForm() {
        let groupItem = this.getItemForm()?.groupItem;
        const components = this.getStepFilteredComponents;
        const delistUids = [];
        groupItem.qty = {
            lh: 0,
            rh: 0,
            total: 0,
        };
        Object.entries(groupItem.form || {}).map(([uid, formData]) => {
            const [itemUid] = uid?.split("-");
            if (
                components.every((s) => s.uid != itemUid) ||
                !formData.selected
            ) {
                delistUids.push(uid);
                delete groupItem?.form?.[uid];
            } else {
                groupItem.qty.lh += Number(formData?.qty?.lh) || 0;
                groupItem.qty.rh += Number(formData?.qty?.rh) || 0;
                groupItem.qty.total += Number(formData?.qty?.total) || 0;
            }
        });
        if (delistUids.length) {
            groupItem.itemIds = groupItem.itemIds?.filter(
                (s) => !delistUids.includes(s),
            );
            this.dotUpdateItemForm("groupItem", groupItem);
            this.updateComponentCost();
        }
    }
}

function getCombinations(
    arr: { title: string; uid: string; stepUid: string }[][],
) {
    // : { titleStack: string[]; uidStack: string[] }[]
    const result: {
        titleStack: string[];
        uidStack: string[];
        stepUidStack: string[];
    }[] = [];

    function backtrack(
        titleStack: string[],
        uidStack: string[],
        stepUidStack: string[],
        index: number,
    ) {
        if (index === arr.length) {
            result.push({
                titleStack: [...titleStack],
                uidStack: [...uidStack],
                stepUidStack: [...stepUidStack],
            });
            return;
        }
        for (const item of arr[index]) {
            titleStack.push(item.title);
            uidStack.push(item.uid);
            stepUidStack.push(item.stepUid);
            backtrack(titleStack, uidStack, stepUidStack, index + 1);
            titleStack.pop();
            uidStack.pop();
            stepUidStack.pop();
        }
    }

    backtrack([], [], [], 0);
    return result;
}
