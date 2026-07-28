import { FieldPath, FieldPathValue } from "react-hook-form";
import {
    ZusGroupItemForm,
    ZusGroupItemFormPath,
} from "../../../_common/_stores/form-data-store";
import { StepHelperClass } from "./step-component-class";
import { dotObject } from "@/app/(clean-code)/_common/utils/utils";

export class GroupFormClass extends StepHelperClass {
    constructor(public itemStepUid) {
        super(itemStepUid);
    }
    public dotGetGroupItemFormValue<K extends FieldPath<ZusGroupItemFormPath>>(
        lineUid,
        path: K
    ): FieldPathValue<ZusGroupItemFormPath, K> {
        return dotObject.pick(
            path,
            this.getItemForm()?.groupItem?.form?.[lineUid]
        );
    }
    public dotUpdateGroupItemForm<K extends FieldPath<ZusGroupItemForm>>(
        path: K,
        value: FieldPathValue<ZusGroupItemForm, K>
    ) {
        this.zus.dotUpdate(
            `kvFormItem.${this.itemUid}.groupItem.form.${path}`,
            value as any
        );
    }

    public dotUpdateGroupItemFormPath<
        K extends FieldPath<ZusGroupItemFormPath>
    >(path, pathName: K, value: FieldPathValue<ZusGroupItemFormPath, K>) {
        this.zus.dotUpdate(
            `kvFormItem.${this.itemUid}.groupItem.form.${path}.${pathName}`,
            value as any
        );
    }
    public getGroupItemForm(path) {
        return this.getItemForm()?.groupItem?.form?.[path];
    }
    public removeGroupItem(path) {
        this.dotUpdateGroupItemFormPath(path, "selected", false);
        this.calculateTotalPrice();
    }
    public updateGroupItemForm(path, newData: ZusGroupItemFormPath) {
        const oldData = this.getGroupItemForm(path);
        const dotOldData = dotObject.dot(oldData);
        const dotNewData = dotObject.dot(newData);
        for (const [key, value] of Object.entries(dotNewData)) {
            if (dotOldData[key] !== value) {
                this.dotUpdateGroupItemFormPath(path, key as any, value);
            }
        }
    }
    public get selectCount() {
        return Object.values(this.getItemForm()?.groupItem?.form).filter(
            (s) => s.selected
        ).length;
    }
}
