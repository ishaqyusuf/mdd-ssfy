"use server";

import { __revalidatePath } from "@/app/(v1)/_actions/_revalidate";
import { deleteSaleAction } from "@/actions/delete-sales";
import { restoreSale } from "@/actions/restore-sale";

export async function deleteSalesUseCase(id) {
    const s = await deleteSaleAction(id);
    await __revalidatePath(`/sales-book/${s.type}s`);
}
export async function restoreDeleteUseCase(id) {
    const s = await restoreSale(id);
    await __revalidatePath(`/sales-book/${s.type}s`);
}
