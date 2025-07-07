"use server";

import { createCustomStepProductDta } from "../data-access/dyke-step-dta";

interface Props {
    title;
    price;
    dykeStepId;
    dependenciesUid;
}
export async function createCustomDykeStepUseCase(data: Props) {
    return await createCustomStepProductDta(data);
}
