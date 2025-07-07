"use server";

import { prisma, Prisma } from "@/db";
import { convertToNumber } from "@/lib/use-number";
import { ISalesWizardForm } from "@/types/post";
import { IOrderComponent, WizardKvForm } from "@/types/sales";

export interface ISaveOrderResponse {
    components: IOrderComponent[];
    updates: IOrderInventoryUpdate[];
}
export interface IOrderInventoryUpdate {
    component: IOrderComponent;
    parent?: IOrderComponent;
    currentData?: any;
    checked?;
}
export async function saveSalesComponentAction(
    args: WizardKvForm,
    wizards: ISalesWizardForm[],
) {
    return {} as any;
}
