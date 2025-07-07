"use server";

import { _cache } from "../../_cache/load-data";
import { getSettingAction } from "../../settings";

export async function getInstallCostsAction() {
    return await _cache("install-price-chart", async () =>
        getSettingAction("install-price-chart")
    );
}
