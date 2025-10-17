import { getStepProduct } from "../../../../_action/get-dyke-step-product";

export type IStepProducts = Awaited<ReturnType<typeof getStepProduct>>;
