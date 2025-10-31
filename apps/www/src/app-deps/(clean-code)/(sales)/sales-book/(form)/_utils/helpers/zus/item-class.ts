import { SettingsClass } from "./settings-class";

export class ItemClass extends SettingsClass {
    constructor(public itemUid) {
        super(null, itemUid);
    }
    public get itemIndex() {
        return this.zus.sequence.formItem.indexOf(this.itemUid);
    }
    public get formItem() {
        return this.zus.kvFormItem?.[this.itemUid];
    }
    public deleteItem() {
        this.zus.removeItem(this.itemUid, this.itemIndex);
        const newState = {};
        Object.entries(this.zus.kvFormItem)
            .filter(([a, b]) => a != this.itemUid)
            .map(([a, b]) => (newState[a] = b));
        this.zus.dotUpdate("kvFormItem", newState);
        this.calculateTotalPrice();
    }
}
