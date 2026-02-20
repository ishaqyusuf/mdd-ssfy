import { getBaseUrl } from "@/envs";
import { generateToken } from "@/actions/token-action";
import { SalesHelper } from "@sales/utils/sales-helper";
import { share } from "@gnd/utils/share";
import { openLink } from "./open-link";

export function newSalesHelper() {
    const sp = new SalesHelper(getBaseUrl(), generateToken, share, openLink);
    return sp;
}

