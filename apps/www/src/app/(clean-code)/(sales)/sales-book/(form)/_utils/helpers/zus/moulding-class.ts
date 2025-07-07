import { ZusSales } from "../../../_common/_stores/form-data-store";
import { GroupFormClass } from "./group-form-class";
import { StepHelperClass } from "./step-component-class";

export class MouldingClass extends GroupFormClass {
    constructor(public itemStepUid) {
        super(itemStepUid);
    }
    public getMouldingStepForm() {
        return Object.entries(this.zus.kvStepForm).filter(
            ([uid, data]) =>
                uid.startsWith(`${this.itemUid}-`) && data.title == "Moulding"
        )?.[0]?.[1];
    }

    public getMouldingLineItemForm() {
        const mouldings = this.getSelectedMouldings();

        const resp = {
            mouldings: mouldings.map((m) => {
                const priceModel = this.getCurrentComponentPricingModel(m?.uid);
                return {
                    ...m,
                    basePrice: priceModel?.pricing,
                };
            }),
            pricedSteps: this.getPricedSteps(),
        };
        return resp;
    }
    public getSelectedMouldings() {
        const itemForm = this.getItemForm();
        const mouldingStep = this.getMouldingStepForm();
        const selectionComponentUids = Array.from(
            new Set(itemForm.groupItem?.itemIds?.map((s) => s))
        );

        return selectionComponentUids.map((componentUid) => {
            const component = this.getComponentFromSettingsByStepId(
                mouldingStep?.stepId,
                componentUid
            );
            return component;
        });
    }
}
