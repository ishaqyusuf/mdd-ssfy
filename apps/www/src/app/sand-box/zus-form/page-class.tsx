import { useZusStore } from "./store";

export class ZusClass {
    constructor(public stepUid, public zus) {}

    public get name() {
        return this.zzus?.data.kv?.[this.stepUid]?.name;
    }
    public storeName(val) {
        this.zzus?.dotUpdate("data.kv.abc.name", val);
    }
    public get zzus() {
        return useZusStore.getState();
    }
}
