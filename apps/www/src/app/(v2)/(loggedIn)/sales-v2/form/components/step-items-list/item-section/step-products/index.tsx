import { getStepProduct } from "@/app-deps/(v2)/(loggedIn)/sales-v2/form/_action/get-dyke-step-product";

export type IStepProducts = Awaited<ReturnType<typeof getStepProduct>>;
