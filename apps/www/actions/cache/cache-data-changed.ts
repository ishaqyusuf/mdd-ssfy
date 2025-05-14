import { Tags } from "@/utils/constants";
import { revalidateTag } from "next/cache";

export function __salesOrderIdUpdate() {
    revalidateTag(Tags.salesOrderNos);
}
