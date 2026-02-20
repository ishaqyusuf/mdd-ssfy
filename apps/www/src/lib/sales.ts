import { getBaseUrl } from "@/envs";
import { generateToken } from "@/actions/token-action";
import { SalesUrls } from "@sales/utils/sales-urls";
import { share } from "@gnd/utils/share";
import { openLink } from "./open-link";

export function newSalesUrls() {
    const sp = new SalesUrls(getBaseUrl(), generateToken, share, openLink);
    return sp;
}

